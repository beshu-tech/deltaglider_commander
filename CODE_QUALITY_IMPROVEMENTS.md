# Code Quality Improvements - Implementation Guide

This document tracks code quality improvements identified through systematic codebase analysis.

## Completed Improvements ✅

### 1. Replace window.confirm with ConfirmModal ✅ (P1, Low effort)
**Status**: ✅ COMPLETE
**Commit**: `d3bfd95`

**What was done:**
- Replaced browser-native `window.confirm()` with accessible `ConfirmModal` component
- Updated BucketsPanel to use modal-based confirmation flow
- Updated tests to work with new modal implementation

**Benefits:**
- ✅ WCAG accessible (proper ARIA attributes, keyboard navigation)
- ✅ Themeable and consistent with app design
- ✅ Testable with React Testing Library
- ✅ Better UX with Escape key support and focus management

**Files changed:**
- `frontend/src/features/buckets/BucketsPanel.tsx`
- `frontend/src/features/buckets/__tests__/BucketsPanel.test.tsx`

---

### 2. Create LoadingSpinner Component ✅ (P1, Low effort)
**Status**: ✅ COMPLETE
**Commit**: `154df22`

**What was done:**
- Created reusable `LoadingSpinner` component with standardized sizes
- Added comprehensive test coverage
- Updated BucketsPanel as example usage

**Component API:**
```tsx
<LoadingSpinner
  size="xs" | "sm" | "md" | "lg"  // Default: "md"
  label="Loading..."              // Required for accessibility
  inline={false}                  // Default: false
  className=""                    // Optional additional classes
/>
```

**Benefits:**
- ✅ Single source of truth for loading states
- ✅ Consistent accessibility (aria-hidden + sr-only labels)
- ✅ Standardized sizing across app
- ✅ 100% test coverage

**Next Steps:**
Replace 23 instances across these files:
- `frontend/src/features/upload/components/UploadQueue.tsx`
- `frontend/src/features/savings/BucketSavingsButton.tsx`
- `frontend/src/features/buckets/BucketsPanel.tsx` (partially done)
- `frontend/src/app/layout/Sidebar.tsx`
- `frontend/src/features/file/FilePanel.tsx`
- `frontend/src/features/objects/components/MobileView.tsx`
- `frontend/src/features/objects/components/table/SortButton.tsx`
- `frontend/src/features/objects/components/ObjectsLoadingState.tsx`
- `frontend/src/features/objects/components/cells/CompressionBadge.tsx`
- `frontend/src/features/upload/components/FileDropZone.tsx`
- `frontend/src/features/objects/components/ObjectsPagination.tsx`

**Pattern to replace:**
```tsx
// Before:
<Loader2 className="h-4 w-4 animate-spin" />
<span className="sr-only">Loading...</span>

// After:
<LoadingSpinner size="sm" label="Loading..." />
```

---

## Remaining Improvements (Prioritized)

### 3. 🔴 Refactor BucketRow Component Duplication (P0, Medium effort)
**Status**: ⏳ PENDING
**Estimated effort**: 4-6 hours

**Problem:**
- BucketRow component: 393 lines with massive duplication
- Card variant (lines 136-255) and table variant (lines 257-402) duplicate identical logic
- 82 className attributes indicating excessive inline styling
- Complex animation logic (lines 37-102) tightly coupled

**Recommendation:**
```tsx
// Extract variants into separate components
<BucketCardRow bucket={bucket} />
<BucketTableRow bucket={bucket} />

// Extract shared components
<BucketStats stats={stats} isLoading={isLoading} />
<BucketActions bucket={bucket} onDelete={handleDelete} />

// Extract animation to custom hook
const displayCount = useCountAnimation(stats.object_count, {
  duration: randomDuration(1000, 3000),
  easing: 'easeOutCubic'
});
```

**Files to create:**
- `frontend/src/features/buckets/components/BucketCardRow.tsx`
- `frontend/src/features/buckets/components/BucketTableRow.tsx`
- `frontend/src/features/buckets/components/BucketStats.tsx`
- `frontend/src/features/buckets/components/BucketActions.tsx`
- `frontend/src/features/buckets/hooks/useCountAnimation.ts`

---

### 4. 🔴 Create Error Handling Decorator (P0, Medium effort)
**Status**: ⏳ PENDING
**Estimated effort**: 3-5 hours

**Problem:**
- 5 methods in `src/dgcommander/services/catalog.py` with near-identical error handling
- Repeated pattern: extract error_code, call `_get_s3_error_context()`, raise APIError/SDKError

**Recommendation:**
```python
# Create decorator in src/dgcommander/util/error_handlers.py
@handle_s3_errors({
    "NoSuchBucket": (NotFoundError, "bucket_not_found"),
    "BucketNotEmpty": (APIError, "bucket_not_empty", 409),
})
def delete_bucket(self, name: str) -> None:
    self.sdk.delete_bucket(name)
    self._invalidate_bucket_stats_cache(name)
```

**Files to create:**
- `src/dgcommander/util/error_handlers.py`

**Files to refactor:**
- `src/dgcommander/services/catalog.py`

---

### 5. 🟡 Extract Sidebar Component Responsibilities (P2, Medium effort)
**Status**: ⏳ PENDING
**Estimated effort**: 4-6 hours

**Problem:**
- Main `Sidebar` component: 197 lines (lines 339-536)
- 8 useState hooks managing different concerns
- Multiple responsibilities: bucket list, filtering, creation, profile, navigation

**Recommendation:**
```tsx
// Extract sections to focused components
<BucketListSection buckets={buckets} onBucketCreate={handleCreate} />
<ProfileSection onSignOut={handleSignOut} />

// Create custom hooks
const {
  bucketName, validationError, showForm,
  handleSubmit, handleCancel
} = useBucketCreation();

const { filter, filteredBuckets } = useBucketFilter(buckets);
```

**Files to create:**
- `frontend/src/app/layout/components/BucketListSection.tsx`
- `frontend/src/app/layout/components/ProfileSection.tsx`
- `frontend/src/app/layout/hooks/useBucketCreation.ts`
- `frontend/src/app/layout/hooks/useBucketFilter.ts`

---

## Summary Statistics

| Priority | Status | Count | Total Effort |
|----------|--------|-------|--------------|
| P0 (High) | ⏳ Pending | 2 | 7-11 hours |
| P1 (Medium) | ✅ Complete | 2 | 3-5 hours |
| P2 (Low) | ⏳ Pending | 1 | 4-6 hours |
| **TOTAL** | | **5** | **14-22 hours** |

**Completed**: 2/5 improvements (40%)
**Time invested**: 3-5 hours
**Time remaining**: 11-17 hours

---

## Development Guidelines

### Before You Start:
1. ✅ Read the entire recommendation
2. ✅ Create a new branch: `git checkout -b refactor/issue-name`
3. ✅ Run tests to establish baseline: `make test`

### During Development:
1. ✅ Make incremental changes
2. ✅ Run tests frequently: `make test`
3. ✅ Commit atomically with descriptive messages
4. ✅ Update this document with progress

### After Completion:
1. ✅ Run full test suite: `make test`
2. ✅ Run linting: `make lint`
3. ✅ Run type checking: `make typecheck`
4. ✅ Update this document status to ✅ COMPLETE
5. ✅ Create PR with reference to issue number

---

## Questions or Issues?

If you encounter any problems implementing these improvements:

1. Check the original analysis commit messages for context
2. Review the test files for usage examples
3. Ask in the team chat or create a GitHub discussion

---

*Last updated: 2025-10-30*
*Analysis performed by: Claude Code*
