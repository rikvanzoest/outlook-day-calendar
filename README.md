# outlook-day-calendar
Outlook type calendar/day planner for Home Assistant. Works with Week Planner card or on it's own.

Day View Card editor:

📅 Add/remove/edit calendars (entity, name, color picker)
🎨 8 individual colour pickers (accent, background, surface, border, text, muted, now-line, etc.)
✏️ Font family + mono font (any Google Fonts name), hour height, corner radius
🕐 Toggle 12h/24h time

Week Day Nav Card editor:

Same calendar list + all the colour/font settings
📆 Start of week (Monday vs Sunday), show/hide month label
All colours flow automatically into the popup it opens

Week-planner-card still works the same — the day_popup: key in its YAML now also accepts all the colour/format keys:

day-view-card  v3.0

THREE custom elements — all configured via the Lovelace GUI editor (✏ icon):

custom:day-view-card       — standalone popup day view
custom:week-day-nav-card   — Mon-Sun strip that opens the popup

Plus auto-patches custom:week-planner-card (add  day_popup:  key to config).

Install:  copy to  /config/www/day-view-card.js
          add resource  /local/day-view-card.js  (type: module)

** Yes, Claude.ai was used to create much of the code. 
