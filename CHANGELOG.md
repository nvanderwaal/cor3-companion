# What's new

Each release lists what changed in that version. The newest is at the top.

<!--
Add a line under "Unreleased" in every PR that changes what players see, in plain words, under
### New, ### Improved or ### Fixed. The release workflow turns "Unreleased" into the new version
and uses it as the release notes. Leave out headings that have nothing under them.
-->

## Unreleased

### Fixed

- The job tracker compares your DECRYPT power with the file's crypt rate, so a file you can't decrypt yet shows
  **DECRYPT 24/29 ✗** instead of a green tick.

## 1.4.4 (2026-11-26)

### Fixed

- The expedition choice popup no longer covers a choice or gets cut off by the event panel. The decision help
  (★ Take it, Trade-off, ✕ Skip) now sits under the choice buttons, one line per choice, so you can compare them
  without hovering. The popup keeps the game's own size, with the numbers in place of its arrows.

## 1.4.3 (2026-11-25)

### New

- **Copy your player ID.** A small copy button sits next to your FREEL ID on the profile card and copies the
  whole ID, even the part the card cuts off.

### Improved

- **Shorter expedition choice popup.** The numbers (Risk +15, Rewards +50) now replace the game's arrow boxes, with
  one line of decision help under them. The time left to decide is in the top bar.

### Fixed

- The protocol hint follows the guesses you already submitted.
- The expedition choice popup is no longer cut off by the event panel, and its box grows to fit the notes. It
  moves below the option when there is no room above it.
- Stash prices stay on one line (1.1k cr), so they no longer push the game's stack count (1/3) out of view.
- The protocol hint no longer disappears after your second guess, when the log repeats each guess as "Input: … Result: …".

## 1.4.2 (2026-11-24)

### Fixed

- The helpers no longer load on the community forum.

## 1.4.1 (2026-11-23)

### Fixed

- **Mailbox messages readable in Lite mode.** With Lite mode on, the message cards in the stash's mailbox turned
  white and their light text was unreadable. They stay dark now.

## 1.4.0 (2026-11-23)

### New

- **On Firefox Add-ons.** Install COR3 Companion on Firefox from
  [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/cor3-companion/) and it updates itself. Installed the
  `.xpi` from GitHub? Nothing to do: it moves to the Add-ons version by itself, and your settings stay.

- **Drone parts marked in your stash and loot.** Items the personal drone's stages take are counted on a tag
  (**1/4** … **4/4**) until you have enough; extra copies say **SELL**. Opening an expedition's container shows the same
  tags on the loot, counted against what you already have. Hover a tag for the stages and counts.

### Improved

- **Lighter screen is now Lite mode (Alt+V).** Besides hiding the moving backgrounds and the map fog, it makes the
  frosted-glass windows solid and stops decoration that animates forever, so the game runs much lighter on slower
  computers or with hardware acceleration off. Minigames and timers are left alone. When your browser draws the
  game without the graphics card, the top bar offers it once.

### Fixed

- **Expedition choice popup no longer garbled.** HIGHER / LOWER and MORE / LESS used to be written into the game's own
  Risk and Rewards labels and could overlap them. They now sit on their own line under the game's row, above the
  verdict. The notes also stay off other parts of the expedition screen that show "Risk / Rewards", and long verdicts
  wrap inside the popup.

## 1.3.1 (2026-11-20)

### New

- **On the Chrome Web Store.** Install COR3 Companion on Chrome, Edge or Brave from the
  [Chrome Web Store](https://chromewebstore.google.com/detail/cor3-companion/klgheffipeaecholkjggmklgbmbnbfbi)
  and it updates itself. Using the unzipped copy? Add the store version, then remove the old one; your settings stay.

- **Checks your program strength on jobs.** Jobs that ask you to decrypt a file show whether one of your installed
  programs can open that file type and, once you've analysed the file, whether your DECRYPT power is strong
  enough. HACK now only counts programs that work on that server's type. Market job cards get a ✗ with the reason
  when either falls short.

- **Job steps marked in the server terminal.** In a server's Transit Access, Files and Logs tabs, the IPs, files and
  log lines your jobs need get an outline (red to delete, blue to download) with the full name on hover, and the
  tab gets a dot. IPs to add show next to the tabs with a copy button. The job tracker ticks a step off by itself
  when you do it, shows how many steps are done, and turns green with READY when you can hand the job in.

### Fixed

- **The top bar's expedition button opens Expeditions again.** Clicking "Decision" or "Expedition back" now finds
  the game's Expeditions tab (an icon with no label) and opens it.

- **Protocol solver no longer hides the field buttons.** Its hint now sits at the bottom of the minigame's log
  instead of pushing the Version, Method, Channel and Cipher buttons half out of the window (seen on Firefox).

## 1.3.0 (2026-11-19)

### New

- **On its way to the Chrome Web Store and Firefox Add-ons.** Firefox copies move to the store version by
  themselves. On Chrome, once the store version is out, add it from there and remove the old copy; your
  settings stay.

### Improved

- **Faster and lighter.** Helpers update the moment the game sends new data or changes the screen, instead of
  checking on a timer, and they pause while the game's tab is in the background.
- **Picks up where you left off.** Your jobs, an open expedition decision, expeditions on their way back and
  your stash's prices show as soon as you open the game again, until the game sends fresh data.
- **Warns when the game changes.** If the game changes the data a helper reads, that helper gets a quiet ⚠ in
  the top bar's Helpers menu and in the toolbar menu, so you know its info may be off until an update.
- Needs **Firefox 140** or newer (Firefox for Android 142), the versions that support the add-on's
  "collects no data" label.

## 1.2.10 (skipped)

Not released: the release run was stopped while Firefox Add-ons was reviewing this version, which uses up the
version number. Its changes ship in the next version.

## 1.2.9 (skipped)

Not released on GitHub: the release run sent this version to Firefox Add-ons for review, then stopped before
the GitHub release. Its changes ship in the next version.

## 1.2.8 (2026-11-19)

### New

- **Daily ops helper (Alt+D)** for both daily ops puzzles.
  - *System Log Integrity:* every bad log line gets a red outline with the reason after it, e.g.
    `time: minute 61` or `no /status`, and in the fix step the right error buttons are outlined.
    You tick the lines and press the buttons yourself.
  - *Signal Decode:* reads the short and long pulses, shows the code (e.g. **CODE 4821 · Binary**),
    outlines the right encoding and types the code into the box. You press Confirm yourself.

### Improved

- **Job tracker:** a **copy** button next to every IP in a job's to-do list puts the IP on your clipboard.

## 1.2.7 (skipped)

Never released: a cancelled release run had already sent this version to Mozilla for signing, and each
version can be signed only once. Its changes shipped in the next version.

## 1.2.6 (2026-11-18)

### New

- **Protocol solver (Alt+P)** for the cleaner-bot protocol minigame: shows the best next move, outlines
  the fields you still have to change, and says how many combinations are left.
- **Inventory helper (Alt+I):** the sell price on every item, a border in its rarity colour and the total
  value of your stash.
- **Lighter screen (Alt+V, off by default):** hides and pauses the moving backgrounds and the network map fog.

### Improved

- **Job tracker:** shows the route from Home you can walk now to a server you can't reach directly,
  skipping servers in maintenance and servers your HACK power can't beat. **no route** says which
  server blocks it.
- **Market job cards:** one ✓ or ✗ per job that says whether you can do it now. Hovering the ✗ lists
  what blocks it.
- **Expeditions:** each mercenary shows its death and fail-but-survive chance, and the mission risk
  shows the death chance.
- **Top bar:** shows **Expedition back** when loot is waiting.
- All shortcuts now behave the same way. Alt+H no longer opens Firefox's Help menu while you're in the game.

## 1.2.5 (2026-11-18)

### New

- **Top bar (Alt+B):** a thin strip at the top of the game with your jobs, the next deadline, an open
  expedition decision and switches for the helpers.
- The toolbar menu shows a small note when a newer release is out.

### Improved

- The extension is now called **COR3 Companion**. Your settings and Firefox updates carry over.
- **Expeditions:** the risk/rewards popup shows exact numbers (**HIGHER +8**, **LESS −2**), the mission
  risk after the choice and the time left to decide.
- **Job tracker:** maintenance times, server defence against your HACK power, and when the jobs reset.
- The switches in the toolbar menu now turn helpers on and off in your open cor3.gg tabs.
- ICE WALL Break remembers whether it's on or off.

## 1.2.4 (2026-11-18)

### New

- **Loadout & market helper (Alt+L):** shows what a program or hardware part would do to your setup and
  stars the best upgrade.
- **Toolbar menu** listing every helper with its shortcut, and a new icon.

### Improved

- **Expeditions:** the game's risk/rewards popup now says clearly what changes (risk HIGHER/LOWER,
  rewards MORE/LESS, in the right colours) with a one-line verdict, instead of small side labels.

## 1.2.3 (2026-11-18)

### New

- **Expeditions:** risk and loot labels on decision options, and the exact risk score of a mission.

## 1.2.2 (2026-11-18)

First public release: **ICE WALL Break** helper and **Job tracker**, with a signed Firefox add-on that
updates itself.
