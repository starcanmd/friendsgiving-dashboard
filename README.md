# Stanford Class of 2028 Friendsgiving Dinner, sponsor dashboard

Static site, no build step. Deploy on Vercel by importing this repo (framework preset: Other, output directory: `/`).

## Update the numbers
`data.js` holds every aggregate the page renders (no attendee names). Regenerate it from a fresh RSVP export and the class directory, or edit the counts by hand, then push.

## Files
- `index.html` page structure and copy
- `styles.css` Leland-derived palette and layout
- `app.js` seating map, cross-filtering charts, tooltips
- `data.js` aggregated data (same content as `data.json`)
