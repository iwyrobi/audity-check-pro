
## What’s happening (root cause)
- The UI is sending an update request that includes `department_id` (confirmed by the network log: `PATCH .../work_orders?...` with `{"status":"open","priority":"medium","department_id":"..."}`).
- The backend rejects it with: **`new row violates row-level security policy for table "work_orders"`** (HTTP 403).
- Even though we updated the RLS policy to allow creators/admins to reassign departments, the request is still being denied in practice for this “change department” scenario.

Given this is blocking and we’ve already iterated on the policy, the most reliable fix is to move the **department reassignment** into a backend function that:
1) validates the caller is the creator/admin, and
2) performs the update with elevated privileges in a controlled way.

This avoids any RLS edge-case behavior during `UPDATE` evaluation and makes the “reassign department” rule explicit and testable.

---

## Goal
Allow **work order creator (e.g., Dewi) and admins** to change the assigned department even if the new department is different from their own.

---

## Implementation plan

### 1) Backend: add a dedicated “reassign department” function
Create a database function (security definer) like:

- **Function name**: `reassign_work_order_department`
- **Inputs**: `work_order_id uuid`, `new_department_id uuid`
- **Rules enforced inside function**:
  - User must be authenticated (`auth.uid()` exists)
  - User must be either:
    - creator of the work order (`work_orders.created_by = auth.uid()`), OR
    - admin / super admin (`is_admin(auth.uid()) OR is_super_admin(auth.uid())`)
  - If not allowed, raise an error (so UI gets a clear message)
- **Action**: update only `department_id` (+ optionally `updated_at = now()`)

Security notes:
- Keep `SECURITY DEFINER` + `set search_path = public` (matches the project’s existing secure pattern).
- Explicitly grant `EXECUTE` to authenticated users and avoid leaving it unintentionally open.

### 2) Frontend: call the function when the department is changed
Update the save logic in **`WorkOrderDetailModal.tsx`**:
- If `assignedDepartment !== workOrder.department_id`:
  - Call `supabase.rpc("reassign_work_order_department", { work_order_id: workOrder.id, new_department_id: assignedDepartment })`
- Then run the normal update for other fields (status/priority/completed_at) via the existing `onUpdate` flow.

This keeps existing update behavior intact, but makes department changes use the “safe path”.

### 3) Improve error visibility (so we don’t fly blind)
Right now, `useWorkOrders.updateWorkOrder()` shows a generic “Failed to update work order”.
- Update it to display the actual backend error message (e.g., `error.message`) in the toast.
- Also `console.error(error)` already exists; we’ll keep it, but the toast should show the real reason.

This will make any remaining permission issues obvious immediately.

### 4) Verification steps (end-to-end)
Test with Dewi (role: `user`, creator of the WO):
1. Open the work order created by Dewi
2. Change Assigned Department to a different department
3. Save
Expected:
- Department changes successfully
- Work order remains visible if your “View work orders” policy requires same-department; if the WO moves to another department, Dewi may no longer see it afterward depending on your SELECT policy (this is expected behavior unless you also want creators to always view their WOs across departments).

Also test:
- Non-creator, non-admin user tries to reassign department → should fail with a clear message.
- Admin can reassign → succeeds.

### 5) Optional follow-up (only if you want)
If you want creators to still see their work orders even after reassignment to another department:
- Update the **SELECT** policy for `work_orders` to include `(created_by = auth.uid())`.
This is a product decision: it expands visibility across departments for creators.

---

## Files we’ll touch (implementation)
Frontend:
- `src/components/workorders/WorkOrderDetailModal.tsx` (call RPC when department changes)
- `src/hooks/useWorkOrders.ts` (improve toast to show real error message)

Backend:
- New migration SQL to create:
  - `public.reassign_work_order_department(...)` function
  - grants/revokes for execute permissions as appropriate

---

## Risks / edge cases
- After reassignment, Dewi may “lose” the work order in the list because current SELECT policy only allows viewing within the user’s department (unless she’s admin). This is separate from update permission and might look like “it disappeared” after saving. If that’s undesirable, we’ll adjust the SELECT policy as an explicit follow-up.
- If Dewi’s profile row is missing (no department assigned), normal updates might still behave oddly in other parts of the app. The RPC approach won’t depend on profile.department for creator/admin checks.

---

## What I need from you (1 quick confirmation)
Do you want creators to still be able to **see** their work orders after they reassign them to another department?
- Option A: Yes (update SELECT policy to include creator)
- Option B: No (current behavior is fine; reassigned WOs only visible to the new department/admins)
