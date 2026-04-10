import { FinancialTransaction, TeamMember } from '../types';

const FINANCIAL_STATE_KEY = 'sas4_financial_state_v2';

type StoredMemberFinance = {
  balance: number;
  commissionRate: number;
  maxTxLimit: number;
  isLimitEnabled: boolean;
};

type StoredFinancialState = {
  centralBalance: number;
  financialTransactions: FinancialTransaction[];
  members: Record<string, StoredMemberFinance>;
};

const getMemberStorageKey = (member: Pick<TeamMember, 'id'>) => String(member.id);

export const readStoredFinancialState = (): StoredFinancialState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(FINANCIAL_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      centralBalance: Number(parsed.centralBalance || 0),
      financialTransactions: Array.isArray(parsed.financialTransactions) ? parsed.financialTransactions : [],
      members: parsed.members && typeof parsed.members === 'object' ? parsed.members : {},
    };
  } catch (error) {
    console.error('Failed to read stored financial state', error);
    return null;
  }
};

export const writeStoredFinancialState = (
  centralBalance: number,
  financialTransactions: FinancialTransaction[],
  teamMembers: TeamMember[]
) => {
  if (typeof window === 'undefined') return;

  const members = Object.fromEntries(
    teamMembers.map((member) => [
      getMemberStorageKey(member),
      {
        balance: Number(member.balance || 0),
        commissionRate: Number(member.commissionRate || 0),
        maxTxLimit: Number(member.maxTxLimit || 0),
        isLimitEnabled: Boolean(member.isLimitEnabled),
      },
    ])
  );

  window.localStorage.setItem(
    FINANCIAL_STATE_KEY,
    JSON.stringify({
      centralBalance,
      financialTransactions,
      members,
    })
  );
};

export const mergeTeamMembersWithStoredFinancialState = (
  teamMembers: TeamMember[],
  storedState: StoredFinancialState | null
) => {
  if (!storedState) return teamMembers;

  return teamMembers.map((member) => {
    const directKey = getMemberStorageKey(member);
    const legacyKey = `${member.id}::${member.username || ''}`;
    const storedMember = storedState.members[directKey] || storedState.members[legacyKey];
    if (!storedMember) return member;

    return {
      ...member,
      balance: Number.isFinite(Number(member.balance)) ? Number(member.balance) : Number(storedMember.balance || 0),
      commissionRate: Number.isFinite(Number(member.commissionRate)) ? Number(member.commissionRate) : Number(storedMember.commissionRate || 0),
      maxTxLimit: Number.isFinite(Number(member.maxTxLimit)) ? Number(member.maxTxLimit) : Number(storedMember.maxTxLimit || 0),
      isLimitEnabled: typeof member.isLimitEnabled === 'boolean' ? member.isLimitEnabled : Boolean(storedMember.isLimitEnabled),
    };
  });
};
