import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any

class BacktestEngine:
    def __init__(self, initial_capital: float = 100000.0, commission_pct: float = 0.00075):
        self.initial_capital = initial_capital
        self.commission_pct = commission_pct

    def _calculate_sma(self, data: pd.DataFrame, period: int) -> pd.Series:
        """Calculates Simple Moving Average."""
        return data['close'].rolling(window=period).mean()

    def _calculate_ema(self, data: pd.DataFrame, period: int) -> pd.Series:
        return data['close'].ewm(span=period, adjust=False).mean()

    def _calculate_vwap(self, data: pd.DataFrame) -> pd.Series:
        df = data.copy()
        df['typical_price'] = (df['high'] + df['low'] + df['close']) / 3
        df['pv'] = df['typical_price'] * df['volume']
        df['date'] = df.index.date
        cum_pv = df.groupby('date')['pv'].cumsum()
        cum_vol = df.groupby('date')['volume'].cumsum().replace(0, 1)
        return cum_pv / cum_vol

    def _calculate_atr(self, data: pd.DataFrame, period: int = 14) -> pd.Series:
        df = data.copy()
        df['tr'] = np.maximum(df['high'] - df['low'], 
                              np.maximum(abs(df['high'] - df['close'].shift()), abs(df['low'] - df['close'].shift())))
        return df['tr'].rolling(window=period).mean()

    def _calculate_rsi(self, data: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculates Relative Strength Index."""
        delta = data['close'].diff()
        gain = delta.clip(lower=0)
        loss = -1 * delta.clip(upper=0)
        
        # Standard RSI uses Wilder's Smoothing (EMA with alpha=1/period)
        avg_gain = gain.ewm(com=period - 1, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(com=period - 1, min_periods=period, adjust=False).mean()
        
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def run_sma_crossover(self,
                          candles: List[Dict],
                          fast_period: int = 10,
                          slow_period: int = 20,
                          symbol: str = "UNKNOWN") -> Dict:
        """
        Runs a backtest for an SMA Crossover strategy.
        Buys when fast SMA crosses above slow SMA, sells when fast SMA crosses below slow SMA.
        """
        if not candles or len(candles) <= slow_period:
            return {"error": "Not enough historical data for the selected period."}

        df = pd.DataFrame(candles)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        df = df.set_index('time')

        # Calculate SMAs
        df['sma_fast'] = self._calculate_sma(df, fast_period)
        df['sma_slow'] = self._calculate_sma(df, slow_period)

        trades = []
        in_position = False
        equity = self.initial_capital
        equity_curve = []
        
        # Start from when both SMAs have enough data
        start_index = max(fast_period, slow_period)

        for i in range(start_index, len(df)):
            current_time = df.index[i]
            current_close = df['close'].iloc[i]
            
            # Always record equity for the current bar
            equity_curve.append({"time": current_time.timestamp(), "value": equity})

            # Ensure we have previous SMA values for crossover detection
            prev_sma_fast = df['sma_fast'].iloc[i-1]
            prev_sma_slow = df['sma_slow'].iloc[i-1]
            curr_sma_fast = df['sma_fast'].iloc[i]
            curr_sma_slow = df['sma_slow'].iloc[i]

            # Entry Signal: Fast SMA crosses above Slow SMA
            if curr_sma_fast > curr_sma_slow and prev_sma_fast <= prev_sma_slow and not in_position:
                in_position = True
                entry_price = current_close
                entry_time = current_time
                qty = (equity * 0.95) / entry_price # Use 95% of equity for the trade
                
                # Find exit
                for j in range(i + 1, len(df)):
                    exit_time = df.index[j]
                    exit_price = df['close'].iloc[j]
                    
                    # Exit Signal: Fast SMA crosses below Slow SMA
                    if df['sma_fast'].iloc[j] < df['sma_slow'].iloc[j] and df['sma_fast'].iloc[j-1] >= df['sma_slow'].iloc[j-1]:
                        pnl = (exit_price - entry_price) * qty
                        commission = (entry_price * qty * self.commission_pct) + (exit_price * qty * self.commission_pct)
                        net_pnl = pnl - commission
                        equity += net_pnl
                        
                        trades.append({
                            "id": f"{symbol}-{len(trades)}",
                            "symbol": symbol,
                            "direction": "Long",
                            "entryPrice": entry_price,
                            "exitPrice": exit_price,
                            "qty": qty,
                            "time": entry_time.timestamp(),
                            "exitTime": exit_time.timestamp(),
                            "pnl": net_pnl,
                            "closeReason": "SMA Crossover"
                        })
                        in_position = False
                        i = j # Skip to the exit bar to prevent immediate re-entry
                        break
                
                # If still in position at the end of data, close it
                if in_position:
                    exit_price = df['close'].iloc[-1]
                    exit_time = df.index[-1]
                    pnl = (exit_price - entry_price) * qty
                    commission = (entry_price * qty * self.commission_pct) + (exit_price * qty * self.commission_pct)
                    net_pnl = pnl - commission
                    equity += net_pnl
                    trades.append({
                        "id": f"{symbol}-{len(trades)}",
                        "symbol": symbol,
                        "direction": "Long",
                        "entryPrice": entry_price,
                        "exitPrice": exit_price,
                        "qty": qty,
                        "time": entry_time.timestamp(),
                        "exitTime": exit_time.timestamp(),
                        "pnl": net_pnl,
                        "closeReason": "End of Backtest"
                    })
                    in_position = False
                    break # End the main loop

        # Calculate summary statistics
        total_pnl = equity - self.initial_capital
        num_trades = len(trades)
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        win_rate = (len(winning_trades) / num_trades * 100) if num_trades > 0 else 0

        gross_profit = sum(t['pnl'] for t in winning_trades)
        gross_loss = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.99 if gross_profit > 0 else 0)

        max_equity = self.initial_capital
        peak_equity = self.initial_capital
        max_drawdown = 0

        # Prepend initial capital to equity curve for accurate drawdown calculation
        full_equity_curve = [{"time": df.index[0].timestamp(), "value": self.initial_capital}] + equity_curve

        for eq_point in full_equity_curve:
            current_val = eq_point['value']
            if current_val > peak_equity:
                peak_equity = current_val
            drawdown = (peak_equity - current_val) / peak_equity if peak_equity > 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        summary_stats = {
            "initial_capital": self.initial_capital,
            "final_equity": equity,
            "total_pnl": total_pnl,
            "num_trades": num_trades,
            "win_rate": win_rate,
            "gross_profit": gross_profit,
            "gross_loss": gross_loss,
            "profit_factor": profit_factor,
            "max_drawdown": max_drawdown * 100, # as percentage
            "avg_win": sum(t['pnl'] for t in winning_trades) / len(winning_trades) if len(winning_trades) > 0 else 0,
            "avg_loss": sum(t['pnl'] for t in losing_trades) / len(losing_trades) if len(losing_trades) > 0 else 0,
        }

        return {
            "trades": trades,
            "equity_curve": full_equity_curve,
            "summary_stats": summary_stats
        }

    def run_rsi_strategy(self,
                         candles: List[Dict],
                         rsi_period: int = 14,
                         overbought_level: int = 70,
                         oversold_level: int = 30,
                         symbol: str = "UNKNOWN") -> Dict:
        """
        Runs a backtest for a simple RSI strategy.
        Buys when RSI crosses above oversold level, sells when RSI crosses below overbought level.
        """
        if not candles or len(candles) <= rsi_period:
            return {"error": "Not enough historical data for the selected period."}

        df = pd.DataFrame(candles)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        df = df.set_index('time')

        # Calculate RSI
        df['rsi'] = self._calculate_rsi(df, rsi_period)

        trades = []
        in_position = False
        equity = self.initial_capital
        equity_curve = []
        
        start_index = rsi_period

        for i in range(start_index, len(df)):
            current_time = df.index[i]
            current_close = df['close'].iloc[i]
            
            prev_rsi = df['rsi'].iloc[i-1]
            curr_rsi = df['rsi'].iloc[i]

            if in_position:
                floating_pnl = (current_close - entry_price) * qty
                equity_curve.append({"time": current_time.timestamp(), "value": equity + floating_pnl})

                # Exit Signal: RSI crosses below overbought level
                if curr_rsi < overbought_level and prev_rsi >= overbought_level:
                    pnl = (current_close - entry_price) * qty
                    commission = (entry_price * qty * self.commission_pct) + (current_close * qty * self.commission_pct)
                    net_pnl = pnl - commission
                    equity += net_pnl
                    
                    trades.append({
                        "id": f"{symbol}-{len(trades)}",
                        "symbol": symbol,
                        "direction": "Long",
                        "entryPrice": entry_price,
                        "exitPrice": current_close,
                        "qty": qty,
                        "time": entry_time.timestamp(),
                        "exitTime": current_time.timestamp(),
                        "pnl": net_pnl,
                        "closeReason": "RSI Overbought"
                    })
                    in_position = False
            else:
                equity_curve.append({"time": current_time.timestamp(), "value": equity})

                # Entry Signal: RSI crosses above oversold level
                if curr_rsi > oversold_level and prev_rsi <= oversold_level:
                    in_position = True
                    entry_price = current_close
                    entry_time = current_time
                    qty = (equity * 0.95) / entry_price
                
        if in_position:
            exit_price = df['close'].iloc[-1]
            exit_time = df.index[-1]
            pnl = (exit_price - entry_price) * qty
            commission = (entry_price * qty * self.commission_pct) + (exit_price * qty * self.commission_pct)
            net_pnl = pnl - commission
            equity += net_pnl
            trades.append({
                "id": f"{symbol}-{len(trades)}",
                "symbol": symbol,
                "direction": "Long",
                "entryPrice": entry_price,
                "exitPrice": exit_price,
                "qty": qty,
                "time": entry_time.timestamp(),
                "exitTime": exit_time.timestamp(),
                "pnl": net_pnl,
                "closeReason": "End of Backtest"
            })
            in_position = False
            if equity_curve:
                equity_curve[-1]["value"] = equity

        # The summary stats calculation is generic and can be reused
        total_pnl = equity - self.initial_capital
        num_trades = len(trades)
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        win_rate = (len(winning_trades) / num_trades * 100) if num_trades > 0 else 0

        gross_profit = sum(t['pnl'] for t in winning_trades)
        gross_loss = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.99 if gross_profit > 0 else 0)
        
        peak_equity = self.initial_capital
        max_drawdown = 0

        # Prepend initial capital to equity curve for accurate drawdown calculation
        full_equity_curve = [{"time": df.index[0].timestamp(), "value": self.initial_capital}] + equity_curve

        for eq_point in full_equity_curve:
            current_val = eq_point['value']
            if current_val > peak_equity:
                peak_equity = current_val
            drawdown = (peak_equity - current_val) / peak_equity if peak_equity > 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        summary_stats = {
            "initial_capital": self.initial_capital,
            "final_equity": equity,
            "total_pnl": total_pnl,
            "num_trades": num_trades,
            "win_rate": win_rate,
            "gross_profit": gross_profit,
            "gross_loss": gross_loss,
            "profit_factor": profit_factor,
            "max_drawdown": max_drawdown * 100, # as percentage
            "avg_win": sum(t['pnl'] for t in winning_trades) / len(winning_trades) if len(winning_trades) > 0 else 0,
            "avg_loss": sum(t['pnl'] for t in losing_trades) / len(losing_trades) if len(losing_trades) > 0 else 0,
        }

        return {"trades": trades, "equity_curve": full_equity_curve, "summary_stats": summary_stats}

    def run_vwap_ema_trend_pullback(self, candles: List[Dict], symbol: str = "UNKNOWN") -> Dict:
        """
        VWAP EMA Trend Pullback Strategy
        Trade in the direction of the trend (EMA50 vs EMA200).
        Pullback entries based on VWAP, RSI, and ATR.
        """
        if not candles or len(candles) <= 200:
            return {"error": "Not enough historical data for the selected period."}

        df = pd.DataFrame(candles)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        df = df.set_index('time')

        # Indicators
        df['ema50'] = self._calculate_ema(df, 50)
        df['ema200'] = self._calculate_ema(df, 200)
        df['vwap'] = self._calculate_vwap(df)
        df['rsi'] = self._calculate_rsi(df, 14)
        df['atr'] = self._calculate_atr(df, 14)

        trades = []
        in_position = False
        equity = self.initial_capital
        equity_curve = []
        
        start_index = 200

        # Position variables
        entry_price = 0
        qty = 0
        sl_price = 0
        tp_price = 0
        direction = ""
        entry_time = None

        for i in range(start_index, len(df)):
            current_time = df.index[i]
            current_close = df['close'].iloc[i]
            current_open = df['open'].iloc[i]
            current_high = df['high'].iloc[i]
            current_low = df['low'].iloc[i]
            
            curr_ema50 = df['ema50'].iloc[i]
            curr_ema200 = df['ema200'].iloc[i]
            curr_vwap = df['vwap'].iloc[i]
            curr_rsi = df['rsi'].iloc[i]
            curr_atr = df['atr'].iloc[i]

            equity_curve.append({"time": current_time.timestamp(), "value": equity})

            if in_position:
                hit_sl = False
                hit_tp = False
                exit_price = 0
                
                if direction == "Long":
                    if current_low <= sl_price:
                        hit_sl = True
                        exit_price = sl_price
                    elif current_high >= tp_price:
                        hit_tp = True
                        exit_price = tp_price
                elif direction == "Short":
                    if current_high >= sl_price:
                        hit_sl = True
                        exit_price = sl_price
                    elif current_low <= tp_price:
                        hit_tp = True
                        exit_price = tp_price

                if hit_sl or hit_tp:
                    pnl = (exit_price - entry_price) * qty if direction == "Long" else (entry_price - exit_price) * qty
                    commission = (entry_price * qty * self.commission_pct) + (exit_price * qty * self.commission_pct)
                    net_pnl = pnl - commission
                    equity += net_pnl
                    
                    trades.append({
                        "id": f"{symbol}-{len(trades)}",
                        "symbol": symbol,
                        "direction": direction,
                        "entryPrice": entry_price,
                        "exitPrice": exit_price,
                        "qty": qty,
                        "slPrice": sl_price,
                        "tpPrice": tp_price,
                        "time": entry_time.timestamp(),
                        "exitTime": current_time.timestamp(),
                        "pnl": net_pnl,
                        "closeReason": "TP" if hit_tp else "SL"
                    })
                    in_position = False
                    equity_curve[-1]["value"] = equity
            else:
                long_trend = curr_ema50 > curr_ema200
                long_ms = current_close > curr_vwap
                long_momentum = 45 <= curr_rsi <= 65
                long_pullback = any(df['low'].iloc[i-j] <= df['ema50'].iloc[i-j] for j in range(3))
                long_trigger = current_close > current_open
                
                short_trend = curr_ema50 < curr_ema200
                short_ms = current_close < curr_vwap
                short_momentum = 35 <= curr_rsi <= 55
                short_pullback = any(df['high'].iloc[i-j] >= df['ema50'].iloc[i-j] for j in range(3))
                short_trigger = current_close < current_open

                if long_trend and long_ms and long_momentum and long_pullback and long_trigger:
                    direction = "Long"
                    entry_price = current_close
                    entry_time = current_time
                    sl_distance = 1.5 * curr_atr
                    sl_price = entry_price - sl_distance
                    tp_price = entry_price + (3 * curr_atr)
                    risk_amount = equity * 0.01
                    qty = risk_amount / sl_distance if sl_distance > 0 else 0
                    if qty > 0:
                        in_position = True
                        
                elif short_trend and short_ms and short_momentum and short_pullback and short_trigger:
                    direction = "Short"
                    entry_price = current_close
                    entry_time = current_time
                    sl_distance = 1.5 * curr_atr
                    sl_price = entry_price + sl_distance
                    tp_price = entry_price - (3 * curr_atr)
                    risk_amount = equity * 0.01
                    qty = risk_amount / sl_distance if sl_distance > 0 else 0
                    if qty > 0:
                        in_position = True

        # Compile statistics similar to other strategies but with extra data points
        total_pnl = equity - self.initial_capital
        num_trades = len(trades)
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        win_rate = (len(winning_trades) / num_trades * 100) if num_trades > 0 else 0
        gross_profit = sum(t['pnl'] for t in winning_trades)
        gross_loss = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.99 if gross_profit > 0 else 0)
        
        peak_equity = self.initial_capital
        max_drawdown = 0
        full_equity_curve = [{"time": df.index[0].timestamp(), "value": self.initial_capital}] + equity_curve
        for eq_point in full_equity_curve:
            current_val = eq_point['value']
            if current_val > peak_equity:
                peak_equity = current_val
            drawdown = (peak_equity - current_val) / peak_equity if peak_equity > 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        long_trades = [t for t in trades if t['direction'] == 'Long']
        short_trades = [t for t in trades if t['direction'] == 'Short']
        
        summary_stats = {
            "initial_capital": self.initial_capital,
            "final_equity": equity,
            "total_pnl": total_pnl,
            "num_trades": num_trades,
            "win_rate": win_rate,
            "gross_profit": gross_profit,
            "gross_loss": gross_loss,
            "profit_factor": profit_factor,
            "max_drawdown": max_drawdown * 100,
            "avg_win": sum(t['pnl'] for t in winning_trades) / len(winning_trades) if len(winning_trades) > 0 else 0,
            "avg_loss": sum(t['pnl'] for t in losing_trades) / len(losing_trades) if len(losing_trades) > 0 else 0,
            "expectancy": (win_rate/100 * (sum(t['pnl'] for t in winning_trades) / len(winning_trades) if len(winning_trades) > 0 else 0)) - ((1 - win_rate/100) * abs(sum(t['pnl'] for t in losing_trades) / len(losing_trades) if len(losing_trades) > 0 else 0)),
            "total_longs": len(long_trades),
            "total_shorts": len(short_trades),
            "long_win_rate": (len([t for t in long_trades if t['pnl'] > 0]) / len(long_trades) * 100) if len(long_trades) > 0 else 0,
            "short_win_rate": (len([t for t in short_trades if t['pnl'] > 0]) / len(short_trades) * 100) if len(short_trades) > 0 else 0,
        }

        return {"trades": trades, "equity_curve": full_equity_curve, "summary_stats": summary_stats}