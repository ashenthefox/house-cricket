# Polish review (fresh reviewer). Screenshots are in design/screenshots/polish-review/.

1. **Phones: the play area is squeezed into the top third.**
   - The floor sits at 40–55% down, with empty fill and thumb buttons below it, and Pip is under the trio portrait.
   - Bosses are off screen or under the HUD or buttons: Duchess is behind the top-right HUD, Big Tok under Kick/Ear/Chirp, and Gargy, Mossy and Peridot aren't on screen at the start. At 1280 and 1920, Gargy starts half cut off at the right.
   - Fix: on short screens the floor sits about 70–75% down; in arenas, frame the boss and Pip together (or lock to the arena), keeping the boss out of the HUD and button zones.
2. **"swapPrev" / "swapNext" show as key chips** in How to Play on touch. That's code on screen.
3. **How to Play doesn't fit at 667×375.**
   - The tab row is cut off, and the "Stick down" chip wraps onto two lines.
   - The scanner flags an orphaned "Jump)". Use "Drop through (+Jump)".
4. **Tutorial tips stay up behind cards, dialogs and pause,** and show through panels that are see-through.
   - Fix: hide tips while any card, dialog or menu is open; make card panels opaque.
   - The chirp tip also appears twice at once in the Bedroom; show one at a time.
5. **The beacon ear is drawn on bosses** (between Nana's eyes, on Duchess and on Big Tok's head) and on or against the Chirp button on phones.
   - Fix: hide it in arenas once the fight starts, and keep it out of the HUD and button zones.
6. **The arena flashes for 25 frames** between the post-boss dialog and the ending or zone-complete card (nana.js:172–173, and the same after Duchess).
   - Fix: start the next screen as the dialog closes.
7. **The Carrier:**
   - stage-9 objects overlap, and the climbing-wall poster sticks out past the glass;
   - on phones, a speech bubble and Pip's spawn point sit under the Kick button;
   - **after the ending, the Carrier has no HUD at all** (no pause, map or mute), which leaves a touch player stuck.
8. **Text inconsistencies:**
   - The Barty gift is announced twice with different wording.
   - The button says "Report a bug" but the form's title is "Send Feedback"; style the form in the game's warm panel look.
   - Narration lines have no left padding.
   - Hints that start with a key chip as the verb: write "Kick [X] each music stone…" and "Press [↑] near a bottle cap…".
   - The tank hint shows keyboard arrows on touch.
   - Keyboard How to Play shows only "→ or D Move".
9. **Menus on small screens:**
   - At 667×375, "Save and Quit to Title" is clipped when Report a bug is shown.
   - The Q/E chips show on touch.
   - The Sound Book has no highlighted tab and no title.
   - The pause and How to Play panels jump in size and position between tabs.
   - The map at the start is one tiny room in a huge parchment; zoom it to what's been found.
   - The title menu covers the hero cricket at 1280 and on phones.
10. **Portraits and the damper card:**
    - Big Tok's and Nana's portraits are small top-down climbing sprites; use side or face portraits.
    - The damper card at 9 rescues, before visiting the Carrier, says "Still missing:" with an empty list; it should say "Everyone's found. Go home to the Carrier and sing together."
