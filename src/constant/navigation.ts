const navigation = {
  setting: '/settings',
  woo: () => '/woo',
  openaiContent: () => '/openai-content',
  managementUser: () => '/management-users',
  configCategories: (id: string) => `/woo/config-categories/${id}`,
  configStore: (id: string) => `/woo/config-store/${id}`,
};
export { navigation };
