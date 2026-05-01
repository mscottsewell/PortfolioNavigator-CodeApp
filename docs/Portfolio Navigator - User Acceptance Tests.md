# Portfolio Navigator - User Acceptance Tests

This guide is for new users who want a quick, structured way to validate the main Portfolio Navigator workflows by using the built-in demo data.

Use these tests in Training Mode so nothing touches live Dataverse records.

## Before You Start

1.  Open Portfolio Navigator [aka.ms/PortfolioNavigator](https://aka.ms/PortfolioNavigator)
2.  Click the graduation cap icon in the header to enter Training Mode.

    You can access training mode directly using [aka.ms/LearnPortfolioNavigator](https://aka.ms/learnportfolionavigator).

3.  Confirm you see:
-   the orange training banner
-   the TRAINING badge in the header
4.  If the data does not match the expected results in this guide, exit Training Mode and enter it again to reset the demo data.

## Demo Data Reference

Use these names throughout the guide. In Training Mode, the app uses a fixed mock manager identity rather than the real signed-in user's name. The table below highlights the demo users referenced in the tests and why they matter.

| **Demo user**     | **Why they matter**                             |
|-------------------|-------------------------------------------------|
| Klaus Sample      | Root manager for the demo hierarchy             |
| Narine Gasparyan  | Good for testing hierarchy navigation           |
| Rinki Verma       | Good for testing drill-down and issue scenarios |
| Aline Dupuy       | Good for testing drill-down and team behavior   |
| Afifah Hairuddin  | Starts over-allocated at 110%                   |
| Laura Montfulleda | Starts under-allocated at 70%                   |
| Isabella Simonsen | Has snapshots but no standing assignments       |
| Asti Kirana       | Has assignments but no snapshots yet            |



>## Recommended Test Order
>Run the tests in the order listed below. If you want to start over at any point, toggle Training Mode off and back on to reset the demo data.


# UAT-01: Enter Training Mode and Verify the Shell

**Goal:** Confirm the app opens correctly and the user can safely work against demo data.

## Steps

1.  Open Portfolio Navigator.
2.  Click the graduation cap icon.
3.  Look at the header.
4.  Confirm the three main tabs are available: Snapshots, Assignments, Services & Initiatives.


## Expected Result

-   Training Mode is clearly indicated by the orange banner and TRAINING badge.
-   The app is usable without errors.
-   The three main tabs are visible.

# UAT-02: Browse and Search the Services & Initiatives Tab

**Goal:** Confirm users can explore the service hierarchy, search it, and view leadership metadata.

## Steps

1.  Open the Services & Initiatives tab.
2.  In the search box, type Training Platform.
3.  Locate the matching result card.
4.  Review the service information.
5.  Clear the search.
6.  Search for Agent.

## Expected Result

-   Matching services are returned as you type.
-   Each service card shows the service name and, when available, a description.
-   Leadership chips such as Owner, PM Lead, and Eng Lead appear when demo data is available.
-   Clearing the search returns the full hierarchy view.

# UAT-03: Navigate the Assignments Hierarchy

**Goal:** Confirm users can browse downward through the assignment hierarchy and return upward without leaving Klaus Sample's subtree.

## Steps

1.  Open the Assignments tab.
2.  Leave the team scope on My Direct Team.
3.  In the employee list, find Narine Gasparyan.
4.  Click Narine's row.
5.  Review the list layout.
6.  Click the Up control in front of the Manager label.

## Expected Result

-   The root view shows Klaus Sample as the manager and Klaus Sample's direct reports underneath.
-   Clicking Narine Gasparyan drills into Narine's team.
-   The page now shows Narine Gasparyan in the Manager section.
-   An Up control appears before the Manager label.
-   Clicking Up returns to Klaus Sample's root team view.
-   Navigation stays within Klaus Sample's reporting hierarchy only.


# UAT-04: Find and Fix Assignment Issues

**Goal:** Confirm the Issues filter works and managers can correct an invalid employee allocation.

## Steps

1.  On the Assignments tab, click the search bar.
2.  Search for Laura Montfulleda.
3.  Open Laura's assignment editor.
4.  Confirm her total is below 100%.
5.  Increase her smaller assignment from 30% to 60%.
6.  Click Save Changes.
7.  Return to the employee list.

## Expected Result

-   Laura Montfulleda appears as an issue case.
-   Laura's editor shows a warning before the change.
-   After saving, Laura's total becomes 100%.
-   The validation warning disappears.
-   Laura is no longer listed as an issue.

# UAT-05: Navigate the Snapshots Hierarchy

**Goal:** Confirm Snapshots uses the same manager-navigation pattern as Assignments.

## Steps

1.  Open the Snapshots tab.
2.  Leave the team selector on My Direct Team.
3.  In the Direct Reports section, click Rinki Verma.
4.  Review the list layout.
5.  Click the Up control before the Manager label.

## Expected Result

-   The list is organized into Manager and Direct Reports.
-   Clicking Rinki Verma drills into Rinki's team instead of opening the snapshot editor.
-   Rinki appears in the Manager section.
-   The Up control is visible while drilled into a subordinate manager.
-   Clicking Up returns to Klaus Sample's root team view.

# UAT-06: Edit and Approve a Snapshot

**Goal:** Confirm a manager can correct invalid snapshot data and complete approval.

## Steps

1.  On the Snapshots tab, drill into Rinki Verma's team.
2.  Select Laura Montfulleda.
3.  In the snapshot editor, confirm Laura is below 100%.
4.  Click Reopen to Edit if the editor is read-only. (make separate test case?)
5.  Change Laura's smaller snapshot from 30% to 60%.
6.  Click Save & Approve.

## Expected Result

-   Laura begins in an invalid state at 70%.
-   The editor shows a validation warning before the change.
-   After updating the percentage, the total becomes 100%.
-   Save & Approve succeeds.
-   Laura's snapshots move to approved status.
-   The row is no longer blocked from approval.

# UAT-07: Validate a Snapshot Edge Case

**Goal:** Confirm demo data still includes a "no assignments" scenario for training and support conversations.

## Steps

1.  Open the Snapshots tab.
2.  Find Isabella Simonsen.
3.  Open Isabella's snapshot editor or review her row.
4.  Switch to the Assignments tab.
5.  Search for Isabella Simonsen.
6.  Open Isabella's assignment editor.

## Expected Result

-   Isabella Simonsen has snapshot data for the current period.
-   Isabella does not have matching standing assignments in the Assignments demo data.
-   Isabella's Assignments view is empty or shows that no standing assignments exist yet.
-   This gives testers a concrete example of snapshot data existing without assignment templates.

# Sign-Off Checklist

Use this checklist when the walkthrough is complete:

-   ☐ Training Mode is easy to enter and clearly labeled
-   ☐ Assignments hierarchy navigation works downward and back up
-   ☐ Assignment issues can be identified and corrected
-   ☐ Services & Initiatives search and detail browsing work
-   ☐ Snapshots hierarchy navigation matches Assignments
-   ☐ Snapshot editing and approval work
-   ☐ Demo edge cases remain available for training
-   ☐ The app is usable without errors
