/**
 * TRADEFINITY PERFORMANCE ENGINE v2.1
 * 
 * Professional trader evaluation system rewarding:
 * - Consistency, Risk Control, Capital Efficiency, Emotional Discipline
 */

// ============================================================================
// SECTION 1 & 2: GLOBAL SCORING RULES & NORMALIZATION
// ============================================================================

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(value, max));
}

export function normalize(value, min, max) {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

export function inverseNormalize(value, min, max) {
  return clamp(100 - normalize(value, min, max), 0, 100);
}

// ============================================================================
// ENGINE EXPORT
// ============================================================================

export function calculateTradefinityMetrics(positions, accountEquity = 1000000, manualBehaviorPenalty = 0, inactiveMonths = 0) {
  if (!positions || positions.length === 0) {
    return _getEmptyMetrics();
  }

  // Sort chronologically ascending
  const sortedPositions = [...positions].sort((a, b) => new Date(a.exit_time || a.created_at) - new Date(b.exit_time || b.created_at));

  // ============================================================================
  // PRE-CALCULATIONS & DATA AGGREGATION
  // ============================================================================
  let grossPnl = 0;
  let totalCost = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let maxDrawdown = 0; 
  let peakEquity = accountEquity;
  let runningEquity = accountEquity;
  
  const dailyReturns = [];
  const activeDaysSet = new Set();
  const activeMonthsSet = new Set();
  const uniqueAssets = new Set();
  
  let currentLossStreak = 0;
  let maxLossStreak = 0;
  
  let totalMarginUsed = 0;
  const assetExposure = {};
  
  let totalHoldDurationSeconds = 0;
  const dailyPnLMap = {};
  
  // Behavior Engine Trackers
  const behaviorFlags = new Set();
  let behaviorPenaltyPointsDynamic = 0;
  let lastLossTime = 0;
  let avgLeverageSum = 0;
  let leverageCount = 0;
  let pnlSumForSpike = 0;
  let pnlCountForSpike = 0;
  let liquidationCount = 0;
  
  // Best/Worst Asset & Regime
  const assetPnL = {};
  const regimeReturns = { bull: 0, bear: 0, sideways: 0 };
  
  // Risk Per Trade Fix
  let totalRiskPctSum = 0;

  sortedPositions.forEach(pos => {
    // 1. Spread Cost & Slippage (Point 1)
    const brokerageCost = parseFloat(pos.charges || pos.fees_paid || 0);
    const spreadCost = parseFloat(pos.spread || 0); 
    const slippageCost = parseFloat(pos.slippage || 0); 
    const tradeCost = brokerageCost + spreadCost + slippageCost;
    
    const posGrossPnl = parseFloat(pos.pnl || pos.net_pnl || 0);
    const effectivePnl = posGrossPnl - tradeCost;
    
    grossPnl += posGrossPnl;
    totalCost += tradeCost;

    const symbol = pos.symbol || 'UNKNOWN';
    uniqueAssets.add(symbol);
    if (!assetPnL[symbol]) assetPnL[symbol] = 0;
    assetPnL[symbol] += effectivePnl;

    const leverage = parseFloat(pos.leverage || 1);
    const marginUsed = parseFloat(pos.margin_used || 0);
    const entryPrice = parseFloat(pos.entry_price || 0);
    const quantity = parseFloat(pos.quantity || 1);
    const stopLoss = parseFloat(pos.stop_loss || 0);

    // 2. Behavior Engine (Point 2)
    let isRevengeTrade = false;
    if (pos.entry_time) {
      const holdDuration = (new Date(pos.exit_time || new Date()).getTime() - new Date(pos.entry_time).getTime()) / 1000;
      totalHoldDurationSeconds += holdDuration;
      
      if (holdDuration < 30) {
        behaviorFlags.add("Rapid Flipping");
        behaviorPenaltyPointsDynamic += 5;
      }

      if (currentLossStreak >= 3 && lastLossTime > 0) {
        const timeSinceLastLoss = (new Date(pos.entry_time).getTime() - lastLossTime) / 1000;
        if (timeSinceLastLoss < 300) { // < 5 mins
          behaviorFlags.add("Revenge Trading");
          behaviorPenaltyPointsDynamic += 10;
          isRevengeTrade = true;
        }
      }
    }

    const avgLev = leverageCount > 0 ? avgLeverageSum / leverageCount : 1;
    if (leverage > avgLev * 3 && leverageCount >= 5) {
      behaviorFlags.add("Leverage Spike");
      behaviorPenaltyPointsDynamic += 10;
    }
    avgLeverageSum += leverage;
    leverageCount++;

    const avgPnl = pnlCountForSpike > 0 ? pnlSumForSpike / pnlCountForSpike : 0;
    if (effectivePnl > avgPnl * 10 && avgPnl > 0 && pnlCountForSpike >= 5) {
      behaviorFlags.add("Suspicious PnL Spike");
    }
    pnlSumForSpike += effectivePnl;
    pnlCountForSpike++;

    let isLiquidated = pos.status === 'LIQUIDATED' || pos.is_liquidated;
    if (isLiquidated) {
      liquidationCount++;
      behaviorFlags.add("Liquidation Event");
      behaviorPenaltyPointsDynamic += 15;
    }

    // 9. Risk Per Trade Fix (Point 9)
    let maxLoss = marginUsed; // Fallback
    if (stopLoss > 0 && entryPrice > 0) {
      maxLoss = Math.abs(entryPrice - stopLoss) * quantity * leverage;
    }
    const riskPct = accountEquity > 0 ? (maxLoss / accountEquity) * 100 : 0;
    totalRiskPctSum += riskPct;

    // Win/Loss
    if (effectivePnl > 0) {
      winningTrades++;
      totalProfit += effectivePnl;
      currentLossStreak = 0;
    } else if (effectivePnl < 0) {
      losingTrades++;
      totalLoss += Math.abs(effectivePnl);
      currentLossStreak++;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      lastLossTime = new Date(pos.exit_time || pos.created_at).getTime();
    }

    // Equity and Drawdown
    runningEquity += effectivePnl;
    if (runningEquity > peakEquity) peakEquity = runningEquity;
    const currentDdPct = peakEquity > 0 ? ((peakEquity - runningEquity) / peakEquity) * 100 : 0;
    if (currentDdPct > maxDrawdown) maxDrawdown = currentDdPct;

    // Date grouping
    const exitDate = new Date(pos.exit_time || pos.created_at);
    if (exitDate && !isNaN(exitDate.getTime())) {
      const dayKey = exitDate.toISOString().split('T')[0];
      const monthKey = dayKey.substring(0, 7);
      
      activeDaysSet.add(dayKey);
      activeMonthsSet.add(monthKey);
      
      if (!dailyPnLMap[dayKey]) dailyPnLMap[dayKey] = { pnl: 0, count: 0, hasRevenge: false, hasLiquidation: false, riskBreach: false };
      dailyPnLMap[dayKey].pnl += effectivePnl;
      dailyPnLMap[dayKey].count += 1;
      if (isRevengeTrade) dailyPnLMap[dayKey].hasRevenge = true;
      if (isLiquidated) dailyPnLMap[dayKey].hasLiquidation = true;
      if (riskPct > 8) dailyPnLMap[dayKey].riskBreach = true; // >8% risk per trade is a breach
    }

    // Portfolio Exposure
    totalMarginUsed += marginUsed;
    if (!assetExposure[symbol]) assetExposure[symbol] = 0;
    assetExposure[symbol] += marginUsed;

    // 4. Market Regime (Point 4)
    const regime = pos.market_regime || 'sideways';
    if (regimeReturns[regime] !== undefined) {
      regimeReturns[regime] += effectivePnl;
    }
  });

  const totalTrades = winningTrades + losingTrades;
  const activeDays = activeDaysSet.size;
  const activeMonths = activeMonthsSet.size;
  
  // 8. Quality Day Validation Fix (Point 8)
  let qualityDays = 0;
  let avgTradesPerDay = 0;
  let returnStdDev = 0;
  if (activeDays > 0) {
    avgTradesPerDay = totalTrades / activeDays;
    let returnSum = 0;
    Object.values(dailyPnLMap).forEach(day => {
      const dayReturnPct = (day.pnl / accountEquity) * 100;
      dailyReturns.push(dayReturnPct);
      returnSum += dayReturnPct;
      
      // Strict Quality Day check
      if (day.pnl > 0 && !day.hasLiquidation && !day.hasRevenge && !day.riskBreach) {
        qualityDays++;
      }
    });
    
    const meanReturn = returnSum / dailyReturns.length;
    const variance = dailyReturns.reduce((acc, val) => acc + Math.pow(val - meanReturn, 2), 0) / dailyReturns.length;
    returnStdDev = Math.sqrt(variance);
  }

  const effectivePnlOverall = grossPnl - totalCost;
  const deploymentAvg = (totalMarginUsed / (totalTrades || 1) / accountEquity) * 100;
  
  // 5. Best/Worst Asset (Point 5)
  let bestAsset = "N/A";
  let worstAsset = "N/A";
  let maxAssetPnl = -Infinity;
  let minAssetPnl = Infinity;
  for (const [sym, pnl] of Object.entries(assetPnL)) {
    if (pnl > maxAssetPnl) { maxAssetPnl = pnl; bestAsset = sym; }
    if (pnl < minAssetPnl) { minAssetPnl = pnl; worstAsset = sym; }
  }

  // Regime Tracking
  let bestRegime = "N/A";
  let worstRegime = "N/A";
  if (totalTrades > 0) {
    const regimes = Object.entries(regimeReturns).sort((a, b) => b[1] - a[1]);
    bestRegime = regimes[0][0];
    worstRegime = regimes[regimes.length - 1][0];
  }

  // ============================================================================
  // SECTION 4: CONSISTENCY SCORE
  // ============================================================================
  const activeScore = normalize(activeDays, 0, 12);
  const qualityDayRatio = activeDays > 0 ? qualityDays / activeDays : 0;
  const qualityScore = normalize(qualityDayRatio, 0.30, 0.70);
  const stabilityScore = inverseNormalize(returnStdDev, 1, 6);
  const drawdownScoreConsistency = inverseNormalize(maxDrawdown, 5, 30);
  const deploymentScore = Math.max(20, 100 - (Math.abs(65 - deploymentAvg) * 1.2));
  
  let overtradingPenalty = 0;
  if (avgTradesPerDay >= 25) overtradingPenalty = 20;
  else if (avgTradesPerDay >= 21) overtradingPenalty = 10;
  else if (avgTradesPerDay >= 11) overtradingPenalty = 5;

  let consistencyScore = (activeScore * 0.20) + (qualityScore * 0.20) + (stabilityScore * 0.25) + (drawdownScoreConsistency * 0.20) + (deploymentScore * 0.15);
  consistencyScore = clamp(consistencyScore - overtradingPenalty, 0, 100);

  // ============================================================================
  // SECTION 5: RISK METER
  // ============================================================================
  // Point 9 fixed: Using actual stop-loss risk distance
  const avgRiskPerTradePct = totalTrades > 0 ? totalRiskPctSum / totalTrades : 0;
  const riskTradeScore = inverseNormalize(avgRiskPerTradePct, 1, 8);
  const riskDrawdownScore = inverseNormalize(maxDrawdown, 5, 35);
  const avgLeverage = leverageCount > 0 ? avgLeverageSum / leverageCount : 1;
  const leverageScore = inverseNormalize(avgLeverage, 1, 10);
  const lossStreakScore = inverseNormalize(maxLossStreak, 2, 10);
  
  // Point 11 fixed: Margin stress uses correct equity containing floating PNL (accountEquity passed from controller)
  const marginStressScoreRaw = (totalMarginUsed / (activeDays || 1) / accountEquity) * 100;
  let marginStressScore = 100;
  if (marginStressScoreRaw > 100) marginStressScore = 60;
  else if (marginStressScoreRaw >= 90) marginStressScore = 80;
  else if (marginStressScoreRaw >= 70) marginStressScore = 95;
  
  const behaviorDeduction = (manualBehaviorPenalty + behaviorPenaltyPointsDynamic) * 2;
  
  let riskScore = (riskTradeScore * 0.25) + (riskDrawdownScore * 0.25) + (leverageScore * 0.20) + (lossStreakScore * 0.15) + (marginStressScore * 0.15);
  riskScore = clamp(riskScore - behaviorDeduction, 0, 100);

  // ============================================================================
  // SECTION 6: PORTFOLIO HEALTH SCORE
  // ============================================================================
  const roiPct = (effectivePnlOverall / accountEquity) * 100;
  const roiScore = clamp(normalize(roiPct, 0, 5), 0, 100);
  const utilScore = deploymentScore;
  const drawdownScoreHealth = inverseNormalize(maxDrawdown, 5, 30);
  const divScore = normalize(uniqueAssets.size, 1, 5);
  
  let maxAssetExposurePct = 0;
  if (totalMarginUsed > 0) {
    const maxExposureVal = Math.max(...Object.values(assetExposure));
    maxAssetExposurePct = (maxExposureVal / accountEquity) * 100;
  }
  let exposureScore = 100;
  if (maxAssetExposurePct >= 50) {
    exposureScore = inverseNormalize(maxAssetExposurePct, 50, 100);
  }

  const healthScore = clamp((roiScore * 0.30) + (utilScore * 0.25) + (drawdownScoreHealth * 0.20) + (divScore * 0.15) + (exposureScore * 0.10), 0, 100);

  // ============================================================================
  // SECTION 7: WIN/LOSS ANALYTICS
  // ============================================================================
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
  const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0);
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? 999 : 0);

  // ============================================================================
  // SECTION 8: ADVANCED EVALUATION READINESS
  // ============================================================================
  const avgMonthlyReturn = activeMonths > 0 ? roiPct / activeMonths : roiPct;
  let returnQualityScore = 100;
  if (avgMonthlyReturn <= 5) {
    returnQualityScore = normalize(avgMonthlyReturn, 2, 5);
  }
  // Point 10: Actual active months
  const monthsScore = normalize(activeMonths, 1, 13);
  const behaviorScore = clamp(100 - (manualBehaviorPenalty * 10) - behaviorPenaltyPointsDynamic, 0, 100);
  
  const evaluationScore = clamp(
    (returnQualityScore * 0.25) + (deploymentScore * 0.20) + (consistencyScore * 0.20) + 
    (riskScore * 0.20) + (monthsScore * 0.10) + (behaviorScore * 0.05),
    0, 100
  );

  // ============================================================================
  // SECTION 9: HOLDING DURATION ANALYTICS
  // ============================================================================
  const avgHoldDuration = totalTrades > 0 ? totalHoldDurationSeconds / totalTrades : 0;
  const avgHoldMinutes = avgHoldDuration / 60;
  let tradingStyle = "Intraday";
  if (avgHoldMinutes < 5) tradingStyle = "Ultra Scalper";
  else if (avgHoldMinutes <= 30) tradingStyle = "Scalper";
  else if (avgHoldMinutes <= 240) tradingStyle = "Intraday";
  else if (avgHoldMinutes <= 1440) tradingStyle = "Swing Intraday";
  else tradingStyle = "Swing Trader";

  // ============================================================================
  // SECTION 14 & 15: SCORE DECAY & OVERALL SCORE
  // ============================================================================
  const scoreDecay = inactiveMonths * 2;
  
  let overallScore = (consistencyScore * 0.35) + (riskScore * 0.30) + (healthScore * 0.20) + (evaluationScore * 0.15);
  overallScore = clamp(overallScore - scoreDecay, 0, 100);

  // ============================================================================
  // SECTION 16: GRADE ENGINE
  // ============================================================================
  let overallGrade = 'D';
  if (overallScore >= 90) overallGrade = 'A+';
  else if (overallScore >= 80) overallGrade = 'A';
  else if (overallScore >= 70) overallGrade = 'B';
  else if (overallScore >= 60) overallGrade = 'C';

  // 12. Report Card Fields (Point 12)
  return {
    consistencyScore: Math.round(consistencyScore),
    riskMeter: Math.round(riskScore),
    portfolioHealth: Math.round(healthScore),
    capitalEvaluationScore: Math.round(evaluationScore),
    overallScore: Math.round(overallScore),
    overallGrade,
    
    tradingStyle,
    behaviorScore: Math.round(behaviorScore),
    behaviorFlags: Array.from(behaviorFlags),
    marginStress: Math.round(marginStressScoreRaw),
    liquidationHistory: liquidationCount,
    
    tradingCosts: totalCost,
    grossPnl: grossPnl,
    effectivePnl: effectivePnlOverall,
    
    bestAsset,
    worstAsset,
    bestRegime,
    worstRegime,
    
    totalProfitLoss: effectivePnlOverall, // legacy backward compat
    realisedPnl: effectivePnlOverall,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    avgProfit: avgWin,
    avgLoss,
    profitFactor,
    winLossRatio: riskRewardRatio,
    avgHoldingDuration: Math.round(avgHoldDuration),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    roiPct: parseFloat(roiPct.toFixed(2))
  };
}

function _getEmptyMetrics() {
  return {
    consistencyScore: 0, riskMeter: 0, portfolioHealth: 0, capitalEvaluationScore: 0,
    overallScore: 0, overallGrade: 'D', tradingStyle: "N/A", behaviorScore: 100,
    behaviorFlags: [], marginStress: 0, liquidationHistory: 0, tradingCosts: 0,
    grossPnl: 0, effectivePnl: 0, bestAsset: "N/A", worstAsset: "N/A",
    bestRegime: "N/A", worstRegime: "N/A",
    totalProfitLoss: 0, realisedPnl: 0, totalTrades: 0, winningTrades: 0,
    losingTrades: 0, winRate: 0, avgProfit: 0, avgLoss: 0, profitFactor: 0,
    winLossRatio: 0, avgHoldingDuration: 0, maxDrawdown: 0, roiPct: 0
  };
}
