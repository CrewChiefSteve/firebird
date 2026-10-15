# Store graphics

| Folder | What | Size |
|---|---|---|
| `appstore/` | iPhone screenshots for the "iPhone with Dynamic Island (medium display)" slot | 1179 × 2556, RGB (no alpha) |
| `play/screenshots/` | Play phone screenshots (Play caps the aspect ratio at 2:1) | 1080 × 2160, RGB |
| `play/icon-512.png` | Play hi-res icon, from `assets/icon.png` | 512 × 512 |
| `play/feature-graphic.png` | Play feature graphic: the shop hero photo with the title | 1024 × 500 |

The screenshots are the app's own screens rendered by its web build in headless Chrome at the device size
(the Android emulator on this machine kept crashing). Public screens show live production data. Crew screens
use the dev demo mode, which shows sample data, so no real hours, wages or receipts appear.

To retake them:

1. In `mobile/.env.local`, set the production Convex URL, the **dev** Clerk key (`pk_test_…`, since a `pk_live` key
   refuses localhost), and `EXPO_PUBLIC_DEMO=1` for the crew screens. Then run `npx expo start`.
2. Run `node store/shoot.mjs <outdir> 393 852 3 "/home|01-home" "/home|02-progress|1000" "/home|03-build-log||Build log" "/home|04-adopt-a-part||Adopt a part" "/?demo|05-time-clock" "/?demo|06-job-board||Jobs" "/?demo|07-ledger||Ledger" "/?demo|08-parts||Parts"`
   for the iPhone set, and the same with `360 720 3` for Play. Each argument is `route|name|scrollY|tab label to tap`.
3. Flatten them to RGB before uploading. App Store Connect rejects PNGs that have alpha.
