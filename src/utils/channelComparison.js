export function calculateEffectiveRates(sendAmount, channels) {
  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return { sortedChannels: [], bestChannel: null };
  }

  const safeAmount = Number(sendAmount) || 500;
  
  const processed = channels.map(ch => {
    const flatFee = Number(ch.flatFee) || 0;
    
    // In our mock, feePercent is treated as an exchange rate margin (effectiveRate), 
    // but the mathematical payout is the same whether it's an upfront fee or a margin.
    // If a channel has both a flat fee and a percentage fee taken upfront:
    const feePercent = Number(ch.feePercent) || 0;
    const percentFeeAmount = safeAmount * (feePercent / 100);
    const totalUpfrontFee = flatFee + percentFeeAmount;
    
    // The rate actually used for conversion. If a channel doesn't provide an explicit offeredRate,
    // we use the midMarketRate (if fee was taken upfront) or the pre-calculated effectiveRate (if fee was baked in).
    // For our fallback logic, if feePercent is already baked into effectiveRate, 
    // then deducting percentFeeAmount * effectiveRate double-counts the fee.
    // Therefore, if we are doing (amount - fee) * rate, the rate should be the pure mid-market rate.
    // Unless the channel explicitly has an offeredRate.
    const offeredRate = Number(ch.offeredRate) || Number(ch.midMarketRate) || Number(ch.effectiveRate) || 0;
    
    const amountToConvert = Math.max(0, safeAmount - totalUpfrontFee);
    const finalPayout = Math.round((amountToConvert * offeredRate) * 100) / 100;
    
    return {
      ...ch,
      flatFee,
      feePercent,
      totalUpfrontFee,
      offeredRate,
      finalPayout
    };
  });
  
  const sortedChannels = processed.sort((a, b) => b.finalPayout - a.finalPayout);
  const bestChannel = sortedChannels[0] || null;
  
  return { sortedChannels, bestChannel };
}
