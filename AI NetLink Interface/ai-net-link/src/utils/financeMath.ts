import { TeamMember } from '../types';

export const MASTER_CAPITAL = 50000;

export const getWalletMembers = (teamMembers: TeamMember[]) =>
  teamMembers.filter((member) => member.role !== 'super_admin');

export const computeTotalWalletBalances = (teamMembers: TeamMember[]) =>
  getWalletMembers(teamMembers).reduce((sum, member) => sum + Number(member.balance || 0), 0);

export const computeCentralBalanceFromTeamMembers = (teamMembers: TeamMember[]) =>
  MASTER_CAPITAL - computeTotalWalletBalances(teamMembers);

export const computeFinancialReconciliation = (teamMembers: TeamMember[], centralBalance: number) => {
  const walletBalances = computeTotalWalletBalances(teamMembers);
  const expectedCentralBalance = computeCentralBalanceFromTeamMembers(teamMembers);
  const totalLiquidity = centralBalance + walletBalances;
  const delta = totalLiquidity - MASTER_CAPITAL;

  return {
    masterCapital: MASTER_CAPITAL,
    walletBalances,
    centralBalance,
    expectedCentralBalance,
    totalLiquidity,
    delta,
    isBalanced: Math.abs(delta) < 0.0001 && Math.abs(expectedCentralBalance - centralBalance) < 0.0001,
  };
};
