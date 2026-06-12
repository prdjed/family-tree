# AGENTS.md

## Project overview

This is a web application for displaying my family tree.

The app uses the **family chart** library to render the family tree. The tree is publicly visible on a website.

The current goal is to allow visitors to suggest corrections or additional information about people in the tree, without directly editing the actual family tree data.

## Main user flow

A visitor can click an action button on a person card in the family tree.

That action should open a separate person proposal/profile page, preferably in a new browser tab.

On that page, the visitor can submit free-form information about that person. Examples:

- Correcting a name
- Adding missing children
- Adding spouse or parent information
- Adding birth/death details
- Writing any other notes they know about the person
- Uploading an image for that person

The image upload is the only non-text input. It should support picking or dropping an image file.

After the visitor clicks submit, the submitted data should be saved as a **proposal** in Firestore.

The actual family tree data must not be edited directly by visitors.

## Future goal

Later, there will be a separate admin app or admin page where I can review submitted proposals and manually decide what should be added to the real family tree.

Do not build the admin app yet unless explicitly asked.

## Important implementation rules

- Remove or disable any current functionality that allows public visitors to directly edit the family tree through JavaScript.
- Visitors should only be able to submit proposals and to see current real data about person when clicked, so user click card it shows data, and user can on same page propse something other, but its not immediately written into real data but into proposal, later i myself choose what should be added to real data.
- Use the existing person IDs from the family tree as the IDs/references for proposal submissions.
- Do not create a new ID system for people unless absolutely necessary.
- Keep the real family tree data separate from submitted proposals.
- It is acceptable to create a dummy Firebase/Firestore service file that I will configure later.
- Do not hardcode real Firebase secrets, API keys, or private configuration.
- Keep changes small and focused.
- Preserve the existing FamilyTree JS setup unless changes are needed for the proposal flow.

## Person proposal page

The proposal/profile page should know which person it belongs to.

Note that real data about user should be written on different place from where proposals are written i dont want to show proposals to public i only want to show data that i myself copied from proposals into real data.

The page should load the person information from the existing tree data using the person ID.

The form should allow free-form text and optional image upload.

## family chart card action

Use the existing FamilyTree JS options to add a custom action button to each person card.

The button should open the proposal/profile page for that specific person.

Do not use the action button to directly edit the tree.

## Verification

After making changes, explain:

1. What changed
2. Which files changed
3. How the person proposal flow works
4. How to test submitting a proposal
5. Any Firebase configuration that still needs to be filled in manually
