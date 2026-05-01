# Portfolio Navigator - User Acceptance Tests (Live Data)   

This guide walks a manager through high-level user acceptance testing in the live app by using their own team data.

## Important Context Before You Start

-   This guide is for **live data**, not Training Mode.
-   Changes you make here will affect real assignment or snapshot records.
-   Only perform edit or approval tests on employees and periods you are authorized to update.
-   Some scenarios depend on what exists in your data today.
-   If a scenario does not apply, mark it N/A

## Important Terms

| Term                               | What it means                                                                         | Why it matters in testing                                           |
|------------------------------------|---------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| Assignments                        | The standing records that describe which services or initiatives an employee works on | Changes here shape future monthly snapshots                         |
| Snapshots                          | Monthly allocation records for a specific period                                      | These are what managers review and approve each month               |
| Allocation Period                  | The month or review cycle tied to a set of snapshots                                  | You must be in an editable period to test save and approval actions |
| My Direct Team                     | Your root manager view: you plus your direct reports                                  | This is the main starting point for hierarchy tests                 |
| Sub-manager                        | A direct or indirect report who also manages people                                   | Used for drill-down and scoped team navigation                      |
| Issues                             | Employees whose assignments do not total 100%                                         | Useful for validating warning and correction workflows              |
| Ready / Approved / Review / Import | Row-level snapshot actions shown in the Snapshots grid                                | These indicate what action the app allows for that employee         |
| Services & Initiatives             | The catalog of services and initiatives employees can be assigned to                  | Used in both assignment editing and browsing workflows              |

## Suggested Test Subjects

Before you begin, identify the best-fit records in your own data:

| Test role                                                      | Suggested person or record |
|----------------------------------------------------------------|----------------------------|
| Current manager                                                | Yourself                   |
| Sub-manager to drill into                                      |                            |
| Employee with healthy assignments                              |                            |
| Employee with assignment issue                                 |                            |
| Employee with pending snapshots                                |                            |
| Employee with no snapshots but standing assignments (optional) |                            |
| Current editable period                                        |                            |
## Recommended Test Order

Run the tests in the order below. Record Pass, Fail, or N/A for each one.


# UAT-LIVE-01: Open the App and Verify the Shell

**Goal:** Confirm the live app loads correctly and reflects the real logged-in manager context.

## Steps

1.  Open Portfolio Navigator in your model-driven app.
2.  Confirm that Training Mode is not enabled.
3.  Review the header and tab bar.
4.  Confirm the main tabs are available:
-   Snapshots
-   Assignments
-   Services & Initiatives

## Expected Result

-   The app loads without errors.
-   Your real user context is shown, not the Training Mode banner.
-   The app opens to either Assignments or Snapshots, depending on pending work.
-   The tab set is available and usable.

# 

***

# UAT-LIVE-02: Browse and Search the Services & Initiatives Tab

***

**Goal:** Confirm that the live service catalog can be browsed and searched successfully.

## Steps

1.  Open the Services & Initiatives tab.
2.  Search for a service, initiative, area, or leader name that you know exists in your organization.
3.  Review one of the matching service cards.
4.  Clear the search.
5.  Expand or browse additional sections as needed.

## Expected Result

-   Matching services appear as you type.
-   A service card shows its name and, when available, parent relationship or description.
-   Leadership details such as Owner, PM Lead, or Eng Lead appear when the underlying data exists.
-   Clearing the search returns to the broader service hierarchy view.

# 

***

# UAT-LIVE-03: Navigate the Assignments Hierarchy

***

**Goal:** Confirm the Assignments hierarchy supports scoped drill-down and upward navigation inside your subtree.

## Steps

1.  Open the Assignments tab.
2.  Leave the team scope on My Direct Team.
3.  Find a direct report who is also a manager.
4.  Click on that manager's row.
5.  Review the scoped list.
6.  Click the Up control before the Manager label.

## Expected Result

-   Your root view shows your direct team.
-   Clicking a manager drills into that manager's team.
-   The selected manager moves into the Manager section.
-   The Up control appears while drilled into a subordinate manager.
-   Clicking Up returns you one level closer to your root team view.
-   Navigation never moves above your own manager subtree.

# UAT-LIVE-04: Search and Review Employees in Assignments

***

**Goal:** Confirm search can find employees within your loaded hierarchy and open the correct assignment editor.

## Steps

1.  Stay on the Assignments tab.
2.  In the search box, type the name of an employee in your hierarchy.
3.  Select a matching employee.
4.  Review the Assignment Editor.

## Expected Result

-   The search returns matching employees from your hierarchy.
-   Selecting a result opens the correct employee in the Assignment Editor.
-   The editor shows the employee's current assignment rows, percentages, and total allocation state.

# 

***

# UAT-LIVE-05: Find and Fix an Assignment Issue

***

**Goal:** Confirm the Issues filter works and that assignment problems can be corrected.

## Steps

1.  On the Assignments tab, click the Issues toggle if it is available.
2.  If an employee with an issue exists, open that employee.
3.  Review the validation message.
4.  Adjust percentages or rows as needed to bring the employee to 100%.
5.  Click Save Changes.

## Expected Result

-   The Issues filter shows only employees with assignment totals that are not 100%.
-   The selected employee shows a clear warning before correction.
-   After saving, the employee's allocation total is updated.
-   If corrected successfully, that employee should no longer appear in the issue list.

>   If there are no assignment issues in your current data, mark this test as N/A.

# UAT-LIVE-06: Navigate the Snapshots Hierarchy and Period

***

**Goal:** Confirm the Snapshots page supports period selection and subtree navigation just like Assignments.

## Steps

1.  Open the Snapshots tab.
2.  Select the current editable period, if needed.
3.  Review the My Direct Team view.
4.  Click a direct report who is also a manager.
5.  Use the Up control to return.

## Expected Result

-   The page loads the selected period correctly.
-   The list is organized into Manager and Direct Reports.
-   Clicking a manager drills into that manager's team instead of opening the editor.
-   The Up control returns you to the previous level in your subtree.

# 

***

# UAT-LIVE-07: Edit and Approve a Snapshot

***

**Goal:** Confirm a pending snapshot can be reviewed, corrected if needed, and approved.

## Steps

1.  On the Snapshots tab, open an employee whose snapshots are still pending review.
2.  Review the snapshot rows and total percentage.
3.  If needed, click Reopen to Edit and make a small valid correction.
4.  Click Save & Approve, or click the row-level approval action if no edits are required.
5.  Return to the grid and review the updated state.

## Expected Result

-   The employee's snapshot editor opens with the correct period data.
-   Validation warnings appear if totals are not at 100%.
-   A successful approval changes the employee's state from pending to approved.
-   The grid reflects the updated status after the save/approval flow completes.

>  If there are no pending snapshots in the selected period, mark this test as N/A.

# Optional Live-Data Scenarios

Use these only if the records exist in your environment and it is safe to test them.

## Optional A: Import Snapshots from Assignments

1.  Find an employee with standing assignments but no snapshots in the selected period.
2.  Click the row-level Import action.
3.  Confirm snapshot rows are created from the employee's assignments.

**Expected Result**
-   Snapshot rows appear after import.
-   The imported services and percentages match the employee's assignments.

## Optional B: Validate a Snapshot Edge Case

1.  Find an employee with snapshots but no corresponding standing assignments.
2.  Compare that employee between the Snapshots and Assignments tabs.

**Expected Result**
-   The employee has snapshot data for the selected period.
-   The Assignments view does not show matching standing assignments.



# Sign-Off Checklist

Use this checklist when the walkthrough is complete:

-   Live app shell loads correctly for the real logged-in manager
-   Services & Initiatives browsing and search work
-   Assignments hierarchy drill-down and Up navigation work
-   Employee search opens the correct assignment editor
-   Assignment issue handling works, or was confirmed not applicable
-   Snapshots hierarchy and period selection work
-   Snapshot editing and approval work, or were confirmed not applicable
-   Optional live-data scenarios were completed or marked N/A
