import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    colorPrimary: '#4F46E5',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgElevated: '#ffffff',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    colorText: '#111827',
    colorTextSecondary: '#6B7280',
    colorBorder: '#E5E7EB',
    colorBorderSecondary: '#F3F4F6',
    controlHeight: 36,
    controlHeightLG: 44,
    padding: 16,
    paddingLG: 24,
    paddingXL: 32,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#F9FAFB',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemPaddingInline: 12,
      itemHeight: 40,
      iconSize: 18,
      collapsedIconSize: 20,
      colorItemBgSelected: '#EEF2FF',
      colorItemTextSelected: '#4F46E5',
      colorItemBgHover: '#F3F4F6',
    },
    Card: {
      paddingLG: 20,
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
    Table: {
      borderRadiusLG: 12,
      headerBg: '#F9FAFB',
      headerColor: '#374151',
      rowHoverBg: '#F9FAFB',
      cellPaddingInline: 16,
      cellPaddingBlock: 12,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      paddingInline: 16,
      paddingInlineLG: 24,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      paddingInline: 12,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
    },
    Form: {
      labelColor: '#374151',
      labelFontSize: 14,
      itemMarginBottom: 20,
    },
    Modal: {
      borderRadiusLG: 16,
      titleFontSize: 18,
    },
    Drawer: {
      borderRadiusLG: 0,
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Progress: {
      borderRadius: 100,
    },
    Message: {
      contentBg: '#ffffff',
    },
  },
};

export default theme;
