import { Transaction } from '../types/finance';

/** Legacy investment records without an action are ordinary deposits. */
export const isRedemption = (tx: Pick<Transaction, 'type' | 'investmentAction'>): boolean =>
  tx.type === 'investment' && tx.investmentAction === 'redeem';
export const isInvestmentDeposit = (tx: Pick<Transaction, 'type' | 'investmentAction'>): boolean =>
  tx.type === 'investment' && !isRedemption(tx);
export const amountOf = (tx: Pick<Transaction, 'amount'>): number => Number(tx.amount) || 0;
export const investmentTotals = (transactions: Transaction[]) => {
  const deposits = transactions.filter(isInvestmentDeposit).reduce((sum, tx) => sum + amountOf(tx), 0);
  const redemptions = transactions.filter(isRedemption).reduce((sum, tx) => sum + amountOf(tx), 0);
  return { deposits, redemptions, net: deposits - redemptions };
};
