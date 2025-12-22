export const endpoints = {
  healthCheck: "/health-check",
  adminLogin: "/public/admin/login",
  adminLogout: "/public/admin/logout",
  assets: {
    totalSupply: "/common/assets/total-supply",
  },
  adminMe: "/internal/auth/me",
  users: {
    all: "/internal/external-users/all",
    details: (userId: string) => `/internal/users/details/${userId}`,
    sharerAnalytics: (userId: string) =>
      `/internal/referral/analytics/sharer/${userId}`,
  },
  referral: {
    listing: "/internal/referral/listing",
    uniques: "/internal/referral/listing-uniques",
    analytics: {
      sharer: (userId: string) =>
        `/internal/referral/analytics/sharer/${userId}`,
      entity: (entityId: string) =>
        `/internal/referral/analytics/entity/${entityId}`,
    },
    getConfig: "/internal/referral/referral-config",
    updateReferral: "/internal/referral/referral-levels",
  },

  grwb: {
    healthCheck: "/internal/grwb/health-check",
  },
  entities: {
    llm: {
      pollQueryResult: (llmQueryId: string) =>
        `/internal/llm/poll-query-result/${llmQueryId}`,
      generate: "/internal/llm/generate",
    },
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
      overallPollStats: "/internal/overall-poll-stats",
      advancedListing: "/internal/poll/advanced-listing",
      getdetailsById: (id: string) => `/internal/poll/analytics/${id}`,
    },
    trials: {
      all: "/internal/trial/list",
      create: "/internal/trial",
      update: "/internal/trial",
      delete: "/internal/trial",
      getById: (id: string) => `/internal/trial/${id}`,
      addPollToTrial: (id: string) => `/internal/trial/${id}/polls`,
      advancedListing: "/internal/trial/advanced-listing",
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
    blogs: {
      all: "/internal/blogs",
      getById: (id: string) => `/internal/blogs/${id}`,
      create: "/internal/blogs",
      update: (id: string) => `/internal/blogs/${id}`,
      delete: "/internal/blogs",
    },
    slug: {
      create: "/internal/preference/slugs",
      all: "/internal/preference/slugs",
    },
  },
  web3: {
    createXamanPayload: "/internal/web3/createxamanpayload",
    getXamanPayload: (uuid: string) =>
      `/internal/web3/getxamanpayload?uuid=${encodeURIComponent(uuid)}`,
    createbatchTransfer: "/internal/asset-ledger/sell-intent/batch-transfer",
    recordAptosBatchResult: "/internal/asset-ledger/sell-intent/aptos/result",
    checkAddressActivation: "/internal/asset-ledger/sell-intent/address-status",
  },
};
