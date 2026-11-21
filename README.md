# <img src="src/icons/icon-128.png" alt="" width="40" align="center"> COR3 Companion

**Play cor3.gg with a sharper edge.** COR3 Companion solves the puzzles with you, keeps track of your jobs and
the route to every server, tells you which upgrade is worth buying, and shows the real odds on expeditions.
All of it right inside the game.

[![Install for Firefox](https://img.shields.io/badge/Firefox-Install-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)](#firefox)
[![Install for Chrome](https://img.shields.io/badge/Chrome%2C%20Edge%2C%20Brave-Install-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](#chrome-edge-brave)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/nvanderwaal)

Free, no account, no tracking. Works in Firefox, Chrome, Edge and Brave.

<img src="store/screenshots/1-job-tracker.png" alt="Job tracker: every taken job with its to-do list, server access and the route to each server" width="800">

## What you get

| Helper | What it does for you | Key |
|---|---|---|
| [Job tracker](#job-tracker) | Your jobs, what's left to do, and the route to every server | Alt+J |
| [Expeditions](#expeditions) | Clear risk and reward numbers on every decision, and real death odds | Alt+E |
| [Loadout & market](#loadout--market) | Whether a part or program is an upgrade before you buy it | Alt+L |
| [ICE WALL Break](#ice-wall-break) | Where the pattern can still fit, until only the answer is left | Alt+H |
| [Inventory](#inventory) | Sell prices, rarity colours, your stash's total value and drone parts to keep | Alt+I |
| [Protocol solver](#protocol-solver) | The best next move in the cleaner-bot protocol minigame | Alt+P |
| [Daily ops](#daily-ops) | Spots the bad log lines and decodes the signal for you | Alt+D |
| [Top bar](#top-bar) | What needs you now, at a glance | Alt+B |
| [Lighter screen](#lighter-screen) | Hides moving backgrounds and map fog (off until you want it) | Alt+V |

Every helper can be switched on or off with its key, from the extension's icon in the toolbar, or from the
**Helpers** menu in the top bar. It remembers your choices.

## Install

### Chrome, Edge, Brave

Install it from the [Chrome Web Store](https://chromewebstore.google.com/detail/cor3-companion/klgheffipeaecholkjggmklgbmbnbfbi):
click **Add to Chrome**, then **Add extension**. It **updates itself**. Edge users: allow extensions from other
stores when Edge asks.

### Firefox

COR3 Companion is on its way to Firefox Add-ons. Until it's there:

1. On the [releases page](https://github.com/nvanderwaal/cor3-companion/releases), click
   `cor3-companion-firefox.xpi` in the newest release that has it. A new release gets it once Mozilla has
   reviewed that version, which can take a day or two.
2. Firefox asks to install the add-on: click **Continue to Installation**, then **Add**.

It's signed by Mozilla and **updates itself**, also to the Firefox Add-ons version once that's out.

### Manual install on Chrome (no store)

If you'd rather not use the store:

1. Download [`cor3-companion-chrome.zip`](https://github.com/nvanderwaal/cor3-companion/releases/latest/download/cor3-companion-chrome.zip) and unzip it into a folder
   you keep, e.g. `Documents\cor3-companion`. Chrome loads the extension from there, so don't delete it.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick that folder.

This copy can't update itself: for a new version, unzip the new zip over the same folder and click the reload icon
on the extension's card. The toolbar menu tells you when there is one.

Then open or reload [cor3.gg](https://cor3.gg). Nothing showing up? Click the puzzle-piece icon in your browser's
toolbar and allow COR3 Companion on cor3.gg.

See what's new in [CHANGELOG.md](CHANGELOG.md).

## Job tracker

A small panel you can drag anywhere, minimise or hide. For every job you've taken:

- **Time left**, and a green **READY** once you can hand it in.
- A **to-do list** with the IPs, files and logs to handle, with checkboxes and a **copy** button on every IP.
- **Your access** to each server: admin, access, no access, via 1 hack, no route or maintenance.
- **The route from Home** you can walk right now, e.g. Home → RM7-S4L2 → 10.0.0.7, with the servers you still
  have to hack in orange. It skips servers in maintenance and servers your HACK power can't beat.
- **Maintenance** times, and each server's defence against your HACK power (**DEF 50 · HACK 42 ✗**). Only
  programs whose HACK works on that type of server count.
- **Your DECRYPT power** next to every file you have to decrypt, from programs that can open that file type
  (**DECRYPT 18.4/25 ✗**). The power a file needs shows once you've analysed it in the game.

In a server's terminal, the IPs, files and log lines your jobs need get an outline (red to delete, blue to
download) with the full name on hover, and their tab gets a dot. IPs to add show next to the tabs with a **copy**
button. Do a step and the tracker ticks it off for you and shows **2/3 done**:

- **Delete** ticks once the row is gone from the list. A misclick or a failed delete doesn't count.
- **Add or upload** ticks once the new row shows up in the list.
- **Download** ticks when you click the download button on an outlined row, since a download doesn't change the
  list. If the game refuses the download, untick it by hand.

Ticks marked **✓ auto** were done by the tracker; you can still tick or untick any step yourself. The job turns
green with **READY** once the game says you can hand it in.

On the market, every job card gets a green ✓ when you can do the job now or a red ✗ with the reason, such as a
server your HACK can't beat or a file no installed program can decrypt.

*Tip:* open the network map and your Loadout once, so the tracker knows the routes and your program strengths.

## Expeditions

<img src="store/screenshots/2-expeditions.png" alt="Expedition decision popup with exact risk and reward numbers" width="640">

The game's risk/rewards popup is tiny and colours "risk up" green. The helper makes it clear:

- **Risk HIGHER +8** in red or **LOWER −20** in green, **Rewards MORE +3** or **LESS −2**, with the exact numbers.
- A one-line verdict: **★ No downside**, **Trade-off: +3 loot for +8 risk**, **✕ More danger, nothing gained**.
- The mission's risk after your choice (**Mission risk 52 → 60**) and the time left to decide.

You also see a mission's exact risk score, e.g. **MODERATE (52)**, and each mercenary's odds, e.g.
**Death 4% · Fail, survives 12%**.

## Loadout & market

<img src="store/screenshots/3-loadout.png" alt="Market GPU card showing the comparison with the current GPU, boot check and program power change" width="640">

Know whether something is worth it before you spend your credits:

- **Hardware:** how it compares to the part you have, whether your setup still boots, and what it does to each
  program's power.
- **Programs:** whether it fits next to your installed programs or in place of one, what it does to your best
  power per ability, and what you're short of if it doesn't fit.
- **★** marks the best upgrade among the cards on screen.

*Tip:* open your Loadout once before you shop. Power for a setup you don't have yet is an estimate (marked ≈).

## ICE WALL Break

<img src="store/screenshots/4-ice-wall.png" alt="ICE WALL Break board with possible spots outlined" width="640">

Yellow outlines show where the target pattern can still fit, with the most likely spots first. As glyphs get
revealed the options shrink, until one turns green with **MATCH**: that's the answer.

## Inventory

<img src="store/screenshots/5-inventory.png" alt="Inventory with sell prices, rarity borders and the stash value" width="640">

Every item gets its sell price in the corner (**12k cr**) and a border in its rarity colour. A line on top shows
your stash's total value and the slots used. Hover a stack's price to see the whole stack's value.

Items you can hand in for the personal drone (Expeditions > Personal drone assembling) get a small tag above the
price that counts them: with 4 Circuit components needed, they say **1/4**, **2/4**, **3/4**, **4/4** (green),
and any after that say **SELL** (grey). The same tags show on the loot when you open an expedition's container,
counting on from what's already in your stash: have 2 of 3 milk and the next one says **3/3**, the one after
**SPARE**. Hover a tag for
the drone stages and how many you need. The list of parts comes from the community guide, since the game doesn't
send it; every option of a stage counts, so you may need fewer if you pay credits or pick another option.

## Protocol solver

In the cleaner-bot protocol minigame, one line above the fields tells you the best move to play next
(**NEXT v1.0 · PUT · Fiber · RSA**), with the fields you still have to change outlined, how many combinations are
still possible, and the **ANSWER** in green once only one is left. With 6 attempts it always wins.

## Daily ops

- **System Log Integrity:** every bad log line gets a red outline with the reason, e.g. `time: minute 61`, and in
  the fix step the right error buttons are outlined. You tick and press them yourself.
- **Signal Decode:** it reads the pulses, shows the code (**CODE 4821 · Binary**), outlines the right encoding and
  types the code in. You press Confirm yourself.

## Top bar

A thin strip at the top of the game that only shows what needs you: **Jobs 2 · 1 READY · next 42m**, a
**Decision 2m 10s** waiting on an expedition, or **Expedition back** with loot waiting. Click a part to jump
there. **Helpers ▾** has all the switches. Click **◆ COR3** to shrink it to a single diamond.

Your jobs, an open decision and expeditions on their way back show as soon as the game opens, from what the
helpers saw last time, until the game sends fresh data.

## Lighter screen

Hides the game's moving background videos and the fog on the network map, so the game uses less of your computer.
Off until you switch it on.

## Fair play and privacy

- It only reads what the game already sends to your browser, and it **never sends anything to the game**.
- It never clicks or plays for you. The one thing it fills in is the Signal Decode code box, which you confirm.
- No account, no tracking, no data collection. It only runs on cor3.gg. See the [privacy policy](PRIVACY.md).

## Questions

**Installed the unzipped Chrome copy earlier?** Add COR3 Companion from the
[Chrome Web Store](https://chromewebstore.google.com/detail/cor3-companion/klgheffipeaecholkjggmklgbmbnbfbi), then
remove the old copy in `chrome://extensions` and delete its folder, so you get updates automatically. On Firefox
there's nothing to do: it moves to the store version by itself. Your settings stay either way.

**A helper shows ⚠?** The game changed the data that helper reads, so it may show wrong or no info until
COR3 Companion is updated. You'll see it on **Helpers ▾** in the top bar and in the toolbar menu. The other
helpers keep working. [Open an issue](https://github.com/nvanderwaal/cor3-companion/issues) if there isn't one yet.

**Found a bug or have an idea?** [Open an issue](https://github.com/nvanderwaal/cor3-companion/issues).

**Like it?** [Buy me a coffee ☕](https://buymeacoffee.com/nvanderwaal)

---

COR3 Companion is a fan-made tool. It is not affiliated with, endorsed by or connected to cor3.gg or its
developers. Every release's files are on the [releases page](https://github.com/nvanderwaal/cor3-companion/releases).
Building and releasing: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Open source under the [MIT License](LICENSE).
