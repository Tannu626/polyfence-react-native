import {StyleSheet} from 'react-native';

export const colors = {
  background: '#FFFFFF',
  foreground: '#09090B',
  muted: '#71717A',
  mutedForeground: '#52525B',
  border: '#E4E4E7',
  accent: '#3B82F6',
  accentHover: '#2563EB',
  destructive: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  tiny: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: typography.heading2.fontSize,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 280,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.heading3.fontSize,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.small.fontSize,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.foreground,
  },
  small: {
    fontSize: typography.small.fontSize,
    fontWeight: '400',
    color: colors.muted,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
  },
  buttonPrimaryText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: colors.border,
  },
  buttonSecondaryText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.foreground,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: typography.tiny.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badgeInactive: {
    backgroundColor: colors.muted,
  },
  errorBanner: {
    backgroundColor: colors.destructive,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 6,
  },
  errorText: {
    fontSize: typography.small.fontSize,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  successBadge: {
    backgroundColor: colors.success,
  },
  activityIndicator: {
    marginRight: spacing.md,
  },
  flexGrow: {
    flex: 1,
  },
  touchable: {
    paddingVertical: spacing.md,
  },
});
