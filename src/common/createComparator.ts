function createComparator<T extends object>(initialValue: T) {
  // 用 structuredClone 保持内部状态
  let prev = structuredClone(initialValue);

  return (next: T): boolean => {
    const isEqual = JSON.stringify(next) === JSON.stringify(prev);
    if (!isEqual) {
      prev = structuredClone(next);
    }
    return !isEqual; // true 表示有变化
  };
}

export { createComparator };
