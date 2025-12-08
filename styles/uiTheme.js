export const colors = {
  /** App background for passenger + driver views */
  background: '#FFFFFF',
  /** Primary surfaces / cards */
  surface: '#FFFFFF',
  surfaceSubtle: '#F5F5F5',
  borderSubtle: '#E5E5E5',
  borderMuted: '#F5F5F5',
  textPrimary: '#000000',
  textSecondary: '#333333',
  textMuted: '#9CA3AF',
  /** Primary NaviGO orange */
  brand: '#F4A300',
  brandSoft: '#FEF3C7',
  brandSoftStrong: '#FDBA74',
  success: '#10B981',
  danger: '#EF4444',
  info: '#3B82F6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  /** Use 12–16px as default; 24px for hero cards / modals */
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const cardStyles = {
  /** Primary elevated card used across driver screens */
  elevated: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  /** Compact card for list items / rows */
  compact: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  /** Soft pill / badge containers */
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
};


