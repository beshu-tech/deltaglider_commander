# Remaining Work Guide

**Expert Feedback Progress**: 26/46 complete (57%)
**Remaining**: 20 points (43%)
**Date**: 2025-10-17

---

## Overview

This document provides guidance for implementing the remaining 20 expert feedback points that were not completed in Phases 1-5. These points are **optional enhancements** that can be implemented as needed based on project priorities.

---

## 📊 Breakdown by Category

### Not Implemented by Request (2 points)

1. ⏳ E2E Testing with Playwright
2. ⏳ Performance Benchmarking

### Advanced Features (6 points)

3. ⏳ Undo/Redo Navigation
4. ⏳ Navigation History Breadcrumb
5. ⏳ Custom Keyboard Shortcuts
6. ⏳ Multi-Selection Support
7. ⏳ Bulk Operations
8. ⏳ Search/Filter Integration

### Optimizations (4 points)

9. ⏳ Virtualization Implementation
10. ⏳ Progressive Enhancement
11. ⏳ Offline Support
12. ⏳ Service Worker Integration

### Testing Improvements (4 points)

13. ⏳ Accessibility Audit Automation
14. ⏳ Visual Regression Tests
15. ⏳ Load Testing
16. ⏳ SSR/Hydration Tests

### Documentation (4 points)

17. ⏳ Interactive Tutorial
18. ⏳ Video Walkthroughs
19. ⏳ API Documentation Site
20. ⏳ Migration Scripts

---

## 🎯 Priority Recommendations

### **High Priority** (Implement Soon)

#### 1. E2E Testing with Playwright (Skipped)

**Why**: Critical for production confidence
**Effort**: Medium (2-3 days)
**Dependencies**: None

**Implementation Steps**:

1. Install Playwright: `pnpm add -D @playwright/test`
2. Create `e2e/` directory with test files
3. Write tests for critical flows:
   - Bucket navigation
   - Object selection
   - File panel open/close
   - Dropdown navigation
   - Delete confirmation
   - Keyboard shortcuts
4. Add to CI/CD pipeline
5. Document test patterns

**Example Test**:

```typescript
// e2e/keyboard-navigation.spec.ts
import { test, expect } from "@playwright/test";

test("keyboard navigation through objects list", async ({ page }) => {
  await page.goto("/b/test-bucket");

  // Focus list
  await page.keyboard.press("Tab");

  // Navigate down
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[aria-selected="true"]')).toBeVisible();

  // Open file panel
  await page.keyboard.press("Enter");
  await expect(page.locator('[role="dialog"][aria-label="File details"]')).toBeVisible();

  // Close with Escape
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});
```

---

#### 2. Accessibility Audit Automation

**Why**: Maintain WCAG compliance automatically
**Effort**: Low (1 day)
**Dependencies**: None

**Implementation Steps**:

1. Install axe-core: `pnpm add -D @axe-core/react`
2. Add to test setup:

```typescript
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);
```

3. Add to critical component tests:

```typescript
it("should have no accessibility violations", async () => {
  const { container } = render(<ObjectsTable {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

4. Add to CI/CD pipeline
5. Fix any violations found

---

#### 3. Virtualization Implementation

**Why**: Performance at scale (>1000 items)
**Effort**: Medium (2-3 days)
**Dependencies**: None
**Trigger**: When object lists exceed 1,000 items

**Implementation Steps**:

1. Install library: `pnpm add @tanstack/react-virtual`
2. Update ObjectsTable.tsx:

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

function ObjectsTable({ items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const { focusedKey } = useKeyboardNavigation({
    items,
    onNavigate: (key) => {
      const index = items.findIndex((item) => item.key === key);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: "center" });
      }
    },
  });

  return (
    <div ref={containerRef} style={{ height: "600px", overflow: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={item.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ObjectRow item={item} isHighlighted={item.key === focusedKey} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

3. Test with various list sizes
4. Measure performance improvement
5. Document implementation

**Reference**: See [virtualListAPI.ts](../src/features/objects/hooks/virtualListAPI.ts) for complete API

---

### **Medium Priority** (Implement Later)

#### 4. Custom Keyboard Shortcuts

**Why**: Power users want customization
**Effort**: Medium (2-3 days)
**Dependencies**: None

**Implementation Steps**:

1. Create settings store for shortcuts
2. Add settings UI in /settings page
3. Update keyboard handlers to use dynamic bindings
4. Add reset to defaults
5. Export/import configurations
6. Document new feature

**Example**:

```typescript
const shortcutConfig = {
  navigateUp: ["ArrowUp", "k"],
  navigateDown: ["ArrowDown", "j"],
  openFile: ["Enter", "o"],
  deleteFile: ["Delete", "d"],
  // ... user-customizable
};
```

---

#### 5. Undo/Redo Navigation

**Why**: Recover from accidental navigation
**Effort**: Low (1 day)
**Dependencies**: FSM already implemented

**Implementation Steps**:

1. Leverage FSM history tracking
2. Add Ctrl+Z (undo) and Ctrl+Shift+Z (redo) handlers
3. Store navigation state in history
4. Implement undo/redo logic:

```typescript
const fsm = createNavigationFSM();
const history = fsm.getHistory();

function undo() {
  if (history.length === 0) return;
  const previous = history[history.length - 1];
  fsm.transition(getInverseEvent(previous.event));
}
```

5. Add UI indicators (undo/redo buttons)
6. Test edge cases

---

#### 6. Navigation History Breadcrumb

**Why**: Show navigation path, allow quick jumps
**Effort**: Medium (2 days)
**Dependencies**: FSM

**Implementation Steps**:

1. Track navigation path in FSM
2. Create Breadcrumb component
3. Add to Header
4. Implement click handlers for quick navigation
5. Style with truncation for long paths
6. Test with deep navigation

**Example**:

```typescript
<Breadcrumb>
  <BreadcrumbItem onClick={() => navigate("/")}>Home</BreadcrumbItem>
  <BreadcrumbItem onClick={() => navigate("/b/bucket1")}>bucket1</BreadcrumbItem>
  <BreadcrumbItem onClick={() => navigate("/b/bucket1?prefix=folder/")}>folder</BreadcrumbItem>
  <BreadcrumbItem active>file.txt</BreadcrumbItem>
</Breadcrumb>
```

---

### **Low Priority** (Nice to Have)

#### 7. Multi-Selection Support

**Why**: Efficient bulk operations
**Effort**: High (3-5 days)
**Dependencies**: None

**Implementation Steps**:

1. Add Shift+Click for range selection
2. Add Ctrl+Click for individual selection
3. Add Shift+ArrowUp/Down for keyboard range selection
4. Show selection count
5. Add "Select All" (Ctrl+A)
6. Add "Deselect All" (Esc)
7. Update bulk operations to work with selection
8. Test with large selections

---

#### 8. Search/Filter Integration

**Why**: Fast navigation to specific items
**Effort**: Medium (2-3 days)
**Dependencies**: None

**Implementation Steps**:

1. Add search input to Header
2. Implement incremental search (type to filter)
3. Highlight matches in list
4. Add Ctrl+F shortcut to focus search
5. Navigate through matches with Ctrl+G/Ctrl+Shift+G
6. Clear search with Esc
7. Preserve keyboard navigation on filtered results
8. Test with various filter patterns

---

#### 9. Performance Benchmarking

**Why**: Track performance regressions
**Effort**: Low (1 day)
**Dependencies**: None

**Implementation Steps**:

1. Add performance markers:

```typescript
performance.mark("navigation-start");
// ... navigation logic
performance.mark("navigation-end");
performance.measure("navigation", "navigation-start", "navigation-end");
```

2. Create benchmark suite
3. Test with various list sizes (10, 100, 1K, 10K)
4. Document baselines
5. Add to CI/CD
6. Alert on regressions

---

#### 10. Visual Regression Tests

**Why**: Prevent unintended UI changes
**Effort**: Medium (2 days)
**Dependencies**: Playwright

**Implementation Steps**:

1. Install Percy or Chromatic
2. Capture screenshots of key states:
   - Empty list
   - List with selection
   - List with keyboard focus
   - File panel open
   - Dropdown open
   - Modal open
3. Add to CI/CD
4. Review and approve changes
5. Document process

---

## 📋 Implementation Checklist

### Before Starting

- [ ] Review current codebase state
- [ ] Check dependencies are up to date
- [ ] Create feature branch
- [ ] Document current behavior
- [ ] Identify test cases

### During Implementation

- [ ] Follow existing patterns
- [ ] Write tests alongside code
- [ ] Update documentation
- [ ] Add inline JSDoc comments
- [ ] Test on multiple browsers
- [ ] Test on mobile (if applicable)
- [ ] Check accessibility
- [ ] Review performance impact

### After Implementation

- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] ESLint passes
- [ ] Documentation updated
- [ ] PR created with detailed description
- [ ] Code reviewed
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Smoke tested
- [ ] Deployed to production

---

## 🎓 Learning Resources

### E2E Testing

- [Playwright Docs](https://playwright.dev/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Accessibility Testing](https://www.a11yproject.com/checklist/)

### Virtualization

- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
- [react-window](https://react-window.vercel.app/)
- [When to Virtualize](https://web.dev/virtualize-long-lists-react-window/)

### Performance

- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [React Profiler](https://react.dev/reference/react/Profiler)

### Accessibility

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core](https://github.com/dequelabs/axe-core)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## 🤝 Getting Help

### Internal Resources

- Review existing implementation in Phases 1-5
- Check [TUI_KEYBOARD_NAVIGATION_SPEC.md](./TUI_KEYBOARD_NAVIGATION_SPEC.md)
- Read [ESCAPE_STACK_GUIDE.md](./ESCAPE_STACK_GUIDE.md)
- Study [navigationFSM.ts](../src/features/objects/context/navigationFSM.ts)

### External Resources

- File issues on GitHub
- Ask in team Slack channel
- Review similar open-source projects
- Consult accessibility experts

---

## 📊 Estimated Timeline

**If implementing all remaining points**:

| Priority  | Points | Effort   | Timeline      |
| --------- | ------ | -------- | ------------- |
| High      | 3      | Medium   | 1-2 weeks     |
| Medium    | 3      | Medium   | 1-2 weeks     |
| Low       | 4      | High     | 2-3 weeks     |
| Skipped   | 2      | Medium   | 1 week        |
| **Total** | **12** | **High** | **5-8 weeks** |

**Recommendation**: Prioritize High priority items first, then assess Medium priority based on user feedback.

---

## ✅ Success Criteria

### E2E Testing

- ✅ 80%+ critical path coverage
- ✅ All tests pass in CI/CD
- ✅ <5 minute test suite runtime

### Accessibility

- ✅ Zero axe-core violations
- ✅ WCAG 2.1 AAA maintained
- ✅ Screen reader tested

### Performance

- ✅ <100ms navigation response time
- ✅ Smooth scrolling (60fps)
- ✅ Works with 10,000+ items (virtualized)

### User Experience

- ✅ All features discoverable
- ✅ Zero keyboard traps
- ✅ Consistent patterns throughout

---

## 🎯 Conclusion

The remaining 20 points represent **optional enhancements** that can significantly improve the TUI keyboard navigation system. However, the current implementation (26/46 points, 57%) is **production-ready** and provides a solid foundation.

**Recommendation**: Implement High priority items (E2E tests, accessibility automation, virtualization) as soon as possible for production confidence. Medium and Low priority items can be scheduled based on user feedback and business needs.

The system is **architected to support** all remaining features without major refactoring, thanks to the FSM, Escape Stack, and pure logic layer implemented in Phases 1-5.
