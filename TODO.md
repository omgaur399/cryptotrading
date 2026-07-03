- [ ] Inspect current `drawSessionBands`, `clearSessionBands`, and session interval gating constants.
- [ ] Add `sessionsDisplayMode` state to `chartData.indicators` (default: Auto).
- [ ] Implement `shouldRenderSessions(chartData)` mapping: Auto shows up to 1H, hides on 4H+.
- [ ] Update `drawSessionBands` / `clearSessionBands` decision logic to use `shouldRenderSessions`.
- [ ] Add UI: display mode selector (Auto / Always Show / Always Hide) shown only when Sessions indicator is enabled.
- [ ] Ensure seamless switching on timeframe change without requiring Sessions re-toggle.
- [ ] Smoke test manually: 1m/3m/5m/15m/30m/1H show; 4H/D/WS+ hide; Always Show/Hide override.

