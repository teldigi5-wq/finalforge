# Mobile scroll single-scroller fix

The Android freeze reproduced in the user recording was caused by nested vertical scroll ownership. CSS combinations such as `overflow-x: hidden` with `overflow-y: visible` compute the visible axis to `auto`, which can create an unintended inner scroll container.

The mobile runtime now keeps `<html>` as the only vertical scroller and uses `overflow-x: clip` + `overflow-y: visible` on body/app/main/sections. Scroll recovery no longer runs on ordinary swipe gestures.
