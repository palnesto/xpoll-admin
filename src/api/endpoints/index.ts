export const endpoints = {
  healthCheck: "/health-check",
  adminLogin: "/public/admin/login",
  adminLogout: "/public/admin/logout",
  adminMe: "/internal/auth/me",
  entities: {
    polls: {
      all: "/internal/poll/list",
      create: "/internal/poll",
      getById: (id: string) => `/internal/poll/${id}`,
      delete: `/internal/poll`,
      edit: {
        details: `/internal/poll/details`,
        addOption: `/internal/poll/options`,
        editOption: `/internal/poll/options`,
        toggleArchiveOption: `/internal/poll/options/archive`,
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
      mint: "/internal/actions/mint",
      burn: "/internal/actions/burn",
      fund: "/internal/actions/fund",
      withdraw: "/internal/actions/withdraw",
      createSellApprove: "/internal/actions/bulk-sell-intent-approve",
      createSellReject: "/internal/actions/bulk-sell-intent-reject",
    },
    assetLedger: {
      all: "/internal/asset-ledger/all",
      systemReport: "/internal/asset-ledger/system/report",
      sellIntent: "/internal/asset-ledger/sell-intent",
      sellIntentAdmin: "/internal/asset-ledger/sell-intent-admin",
      sellApproveOrder: "/internal/asset-ledger/sell-approve",
      sellRejectOrder: "/internal/asset-ledger/sell-reject",
    },
    slug: {
      create: "/internal/preference/slugs",
      all: "/internal/preference/slugs",
    },
    web3: {
    createXamanPayload: "/internal/web3/createxamanpayload",
    getXamanPayload: (uuid: string) =>
      `/internal/web3/getxamanpayload?uuid=${encodeURIComponent(uuid)}`,
    createbatchTransfer: "/internal/asset-ledger/sell-intent/batch-transfer",
    recordAptosBatchResult: "/internal/asset-ledger/sell-intent/aptos/result",
    checkAddressActivation: "/internal/asset-ledger/sell-intent/address-status",
  },
  },
};
