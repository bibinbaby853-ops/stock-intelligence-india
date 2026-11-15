# Stock Intelligence India

Discover businesses. Analyse fundamentals. Identify opportunities.

Personal Android research application for companies listed on the National Stock Exchange and Bombay Stock Exchange. Built with React Native, Expo, TypeScript and Expo Router.

## Installing on a phone

Every change pushed to `main` is built automatically by GitHub Actions. Open the **Releases** page of this repository, choose **Latest build**, and download `stock-intelligence-india.apk`.

## Current status

| Step | Status |
| --- | --- |
| 1. Mobile interface prototype | Done |
| 2. Working Android application | Done: Home, Screener, Discover, Stock detail, Watchlist, Profile, Research assistant, report export, biometric lock |
| 3. Stock database and 4. data ingestion | Not started. The application ships a built-in **sample** data set of fictional companies (`src/data/snapshot.json`, `meta.sample: true`) and labels every screen accordingly |
| 5. Fundamental screening | Working on the sample data: explainable research score and eight rule-based discovery categories |
| 6. Research assistant | Rule-based answers from the database with facts separated from interpretations. Free-form answers need a backend and a paid model key |
| 7. Notifications | Preferences are stored; delivery needs the backend |
| 8. Watchlist | Working, stored on the phone |
| 9. Report export | Working (PDF through the phone's share sheet) |
| 10. Release-ready build | Automatic installable build; no Google Play signing yet |

## How the pieces fit

- `src/data/snapshot.json` is the whole database the application reads. A data collector will replace it with real exchange data and set `meta.sample` to `false`; the sample banner then disappears.
- `src/lib/score.ts` holds the research score (profitability, growth, balance sheet, cash flow, valuation) and the strengths, weaknesses and risks text. Weights are adjustable in Profile.
- `src/lib/discover.ts` holds the discovery category rules.
- `src/lib/assistant.ts` holds the research assistant's question handling.
- `scripts/make-sample-data.mjs` regenerates the sample data set.

## Development

```bash
npm install
npx tsc --noEmit
npx expo start
```

Research scores summarise reported fundamentals. They are not recommendations and do not predict returns.
