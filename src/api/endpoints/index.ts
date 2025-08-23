export const endpoints = {
  healthCheck: "/health-check",
  adminLogin: "/public/admin/login",
  adminLogout: "/public/admin/logout",
  adminMe: "/internal/auth/me",
  entities: {
    polls: {
      all: "/internal/poll/list",
      create: "/poll",
      getById: (id: string) => `/internal/poll/${id}`,
      delete: `/internal/poll`,
      edit: {
        details: `/internal/poll/details`,
        addOption: `/internal/poll/options`,
        editOption: `/internal/poll/options`,
        toggleOption: `/internal/poll/archive`,
      },
      getPollsByTrialId: (id: string) => `/internal/poll/trial/${id}`,
    },
    trials: {
      all: "/internal/trial/list",
      create: "/internal/trial",
      update: "/internal/trial",
      delete: "/internal/trial",
      getById: (id: string) => `/internal/trial/${id}`,
      addPollToTrial: (id: string) => `/internal/trial/${id}/polls`,
    },
    actions: {
      createMint: "/internal/actions/mint",
      createBurn: "/internal/actions/burn",
      createFund: "/internal/actions/fund",
      createWithdraw: "/internal/actions/withdraw",
      createSellApprove: "/internal/actions/bulk-sell-intent-approve",
      createSellReject: "/internal/actions/bulk-sell-intent-reject",
    },
    assetLedger: {
      all: "/internal/asset-ledger/all",
      systemReport: "/internal/asset-ledger/system/report",
      sellIntent: "/internal/asset-ledger/sell-intent",
      sellApproveOrder: "/internal/asset-ledger/sell-approve",
      sellRejectOrder: "/internal/asset-ledger/sell-reject",
    },
  },
};
