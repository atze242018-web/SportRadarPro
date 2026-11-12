# V28 research modules — integration checklist

Status: isolated research implementation, not integrated into Android/Windows production; unit tests committed but not yet run/verified.

## Included
- indicators.mjs: expected value, implied odds, Brier score, log loss, probability calibration, raw closing-odds ratio, capped fractional Kelly, exposure flag, chronological split helper.
- football-models.mjs: Poisson score PMF, Dixon-Coles low-score adjustment, 1X2 probabilities, Elo expected score and update, weighted historical xG.
- *.test.mjs: deterministic smoke/unit checks.

## Before production integration
1. Locate the current authoritative V27 Windows backend source and actual schema for picks, odds, results and timestamps; do not assume the repository main branch is identical to installed V27.
2. Import current **paper-only** historical data, deduplicate by event and freeze data at prediction time. Do not mix old Android account and Windows account.
3. Execute `node --test research/v28/*.test.mjs` in CI and locally, then extend with fixture and schema integration tests.
4. For football, fit Poisson rates, Dixon-Coles rho, home advantage and Elo parameters using **training-only** data; do not use future match results. Use licensed/permitted xG feeds, explicit missing-data handling and provenance.
5. Evaluate chronologically on disjoint match windows; compare to baseline with Brier, log loss, ROI, drawdown and CLV. Avoid claims of profitability from small samples.
6. Add a read-only V28 analysis tab with model version, timestamp, input freshness, missing fields, and historical metrics. Default to no automated decisions from research models.
7. Cap risk and open exposure only after validating bankroll accounting (available balance vs open stake vs equity). Do not change existing demo settings without review.
8. Keep NAS backup unchanged. Export a sanitized JSON snapshot through an authenticated, non-public channel; never commit passwords, WireGuard keys, private account details, or raw personal data.

## Limitations
- Raw CLV odds ratio is a proxy, not bookmaker margin-adjusted closing probability.
- Simple chronological split does not itself prevent duplicate-event leakage; caller must enforce event isolation.
- Poisson matrix is truncated and renormalized; tailMass reports truncation only, not model error.
- Dixon-Coles rho must be fitted and checked for nonnegative score-cell probabilities.
- Fractional Kelly is theoretical and especially sensitive to miscalibrated probability estimates.
- Data source adapters, UI, background sync, Windows installation and production wiring are **not implemented**.
