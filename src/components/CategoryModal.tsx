import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types/finance';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Layers,
  TrendingUp,
  TrendingDown,
  LineChart,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';

export const CategoryModal: React.FC = () => {
  const {
    isCategoryModalOpen,
    closeCategoryModal,
    categories,
    saveCategory,
    deleteCategory,
    saveSubcategory,
    deleteSubcategory,
    moveCategory,
    moveSubcategory,
    reorderCategory,
    reorderSubcategory,
    resetDefaultCategories
  } = useFinance();

  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [newSubName, setNewSubName] = useState<string>('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState<string>('');
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const dragTimer = useRef<number | null>(null);
  const dragKind = useRef<'category' | 'subcategory' | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const draggingRef = useRef<string | null>(null);
  const dragOverRef = useRef<string | null>(null);
  const didDragRef = useRef(false);
  const dragStartPoint = useRef({ x: 0, y: 0 });

  const currentCategories = Object.keys(categories[activeType] || {});
  const currentSubcategories = selectedCat ? categories[activeType]?.[selectedCat] || [] : [];

  useEffect(() => {
    draggingRef.current = draggingItem;
    dragOverRef.current = dragOverItem;
  }, [draggingItem, dragOverItem]);

  const clearDragTimer = useCallback(() => {
    if (dragTimer.current !== null) {
      window.clearTimeout(dragTimer.current);
      dragTimer.current = null;
    }
  }, []);

  const beginHoldDrag = (kind: 'category' | 'subcategory', item: string, event: React.PointerEvent) => {
    clearDragTimer();
    dragKind.current = kind;
    dragPointerId.current = event.pointerId;
    dragStartPoint.current = { x: event.clientX, y: event.clientY };
    didDragRef.current = false;

    dragTimer.current = window.setTimeout(() => {
      didDragRef.current = true;
      draggingRef.current = item;
      dragOverRef.current = item;
      setDraggingItem(item);
      setDragOverItem(item);
    }, 300);
  };

  const cancelHoldDrag = () => {
    clearDragTimer();
    if (!draggingRef.current) {
      dragPointerId.current = null;
      dragKind.current = null;
    }
  };

  const handleDragMove = (event: React.PointerEvent) => {
    if (dragPointerId.current !== event.pointerId) return;

    if (!draggingRef.current && dragTimer.current !== null) {
      const dx = event.clientX - dragStartPoint.current.x;
      const dy = event.clientY - dragStartPoint.current.y;
      if (Math.hypot(dx, dy) > 10) {
        cancelHoldDrag();
        return;
      }
    }

    if (!draggingRef.current) return;
    event.preventDefault();

    const kind = dragKind.current;
    if (!kind) return;
    const point = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const item = point?.closest<HTMLElement>(`[data-reorder-kind="${kind}"]`);
    const itemId = item?.dataset.reorderId;
    if (itemId) setDragOverItem(itemId);
  };

  const finishDrag = (event: React.PointerEvent) => {
    if (dragPointerId.current !== event.pointerId) return;

    clearDragTimer();
    const from = draggingRef.current;
    const target = dragOverRef.current;
    const kind = dragKind.current;

    if (from && target && from !== target && kind) {
      const list = kind === 'category' ? currentCategories : currentSubcategories;
      const rawTargetIndex = list.indexOf(target);
      const fromIndex = list.indexOf(from);
      let targetIndex = rawTargetIndex;

      if (rawTargetIndex >= 0) {
        const targetEl = document.querySelector<HTMLElement>(
          `[data-reorder-kind="${kind}"][data-reorder-id="${CSS.escape(target)}"]`
        );
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          if (event.clientY > rect.top + rect.height / 2) targetIndex += 1;
        }
      }

      if (fromIndex >= 0 && targetIndex > fromIndex) targetIndex -= 1;
      targetIndex = Math.max(0, Math.min(targetIndex, list.length - 1));

      if (targetIndex !== fromIndex) {
        if (kind === 'category') reorderCategory(activeType, from, targetIndex);
        else if (selectedCat) reorderSubcategory(activeType, selectedCat, from, targetIndex);
      }
    }

    didDragRef.current = Boolean(from);
    draggingRef.current = null;
    dragOverRef.current = null;
    dragPointerId.current = null;
    dragKind.current = null;
    setDraggingItem(null);
    setDragOverItem(null);
  };

  if (!isCategoryModalOpen) return null;


  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (saveCategory(activeType, newCatName.trim())) {
      setSelectedCat(newCatName.trim());
      setNewCatName('');
    }
  };

  const handleRenameCategory = (oldName: string) => {
    if (!editingCatValue.trim()) return;
    if (saveCategory(activeType, editingCatValue.trim(), oldName)) {
      if (selectedCat === oldName) setSelectedCat(editingCatValue.trim());
      setEditingCat(null);
    }
  };

  const handleAddSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !newSubName.trim()) return;
    if (saveSubcategory(activeType, selectedCat, newSubName.trim())) {
      setNewSubName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#101a2b] border border-[#2d3e58] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 md:p-5 border-b border-[#26344b] flex items-center justify-between bg-[#0d1627]">
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-[#e8eef8]">
              Manage Categories & Subcategories
            </h3>
            <p className="hidden sm:block text-xs text-[#8ea0ba]">
              Add custom categories, organize sub-items, or reset to standard presets.
            </p>
          </div>
          <button
            onClick={closeCategoryModal}
            className="p-1.5 rounded-lg text-[#8ea0ba] hover:text-white hover:bg-[#1a2b44] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
          {/* Type Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#090f1a] border border-[#26344b]">
            <button
              onClick={() => {
                setActiveType('expense');
                setSelectedCat('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                activeType === 'expense' ? 'bg-rose-600 text-white' : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="sm:hidden">Expense</span><span className="hidden sm:inline">Expense Categories</span>
            </button>
            <button
              onClick={() => {
                setActiveType('income');
                setSelectedCat('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                activeType === 'income' ? 'bg-emerald-600 text-white' : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="sm:hidden">Income</span><span className="hidden sm:inline">Income Categories</span>
            </button>
            <button
              onClick={() => {
                setActiveType('investment');
                setSelectedCat('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                activeType === 'investment' ? 'bg-blue-600 text-white' : 'text-[#8ea0ba] hover:text-white'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span className="sm:hidden">Invest</span><span className="hidden sm:inline">Investment Categories</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Categories Column */}
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b] flex flex-col h-[310px] sm:h-[340px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba]">
                  1. Categories ({currentCategories.length})
                </div>
                <span className="text-[9px] text-[#62738a]">Hold ⋮⋮ and drag to reorder</span>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddCategory} className="flex gap-1.5 mb-2.5">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#142033] border border-[#26344b] text-xs text-white placeholder-[#62738a] focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ touchAction: draggingItem ? 'none' : 'pan-y' }} onPointerMove={handleDragMove} onPointerUp={finishDrag} onPointerCancel={cancelHoldDrag}>
                {currentCategories.map(cat => {
                  const isSelected = selectedCat === cat;
                  const isEditing = editingCat === cat;

                  return (
                    <div
                      key={cat}
                      onClick={() => { if (didDragRef.current) { didDragRef.current = false; return; } if (!isEditing) setSelectedCat(cat); }}
                      data-reorder-kind="category"
                      data-reorder-id={cat}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer select-none transition-all ${
                        draggingItem === cat ? 'opacity-50 scale-[0.98]' : ''
                      } ${
                        dragOverItem === cat && draggingItem !== cat ? 'border border-blue-400 bg-blue-500/15' : ''
                      } ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                          : 'bg-[#121c2d] hover:bg-[#18273f] text-[#c8d4e5]'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-1">
                          <input
                            type="text"
                            value={editingCatValue}
                            onChange={e => setEditingCatValue(e.target.value)}
                            autoFocus
                            className="flex-1 px-2 py-0.5 rounded bg-[#17253b] border border-blue-500 text-xs text-white"
                          />
                          <button
                            onClick={() => handleRenameCategory(cat)}
                            className="p-1 text-emerald-400 hover:bg-emerald-950/40 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCat(null)}
                            className="p-1 text-[#8ea0ba] hover:text-white rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onPointerDown={e => { e.stopPropagation(); beginHoldDrag('category', cat, e); }}
                            onPointerUp={e => { e.stopPropagation(); if (!draggingRef.current) cancelHoldDrag(); }}
                            onPointerCancel={e => { e.stopPropagation(); cancelHoldDrag(); }}
                            style={{ touchAction: 'none' }}
                            className={`p-1.5 mr-1 rounded-md text-[#62738a] hover:text-blue-300 hover:bg-[#18263b] shrink-0 cursor-grab ${draggingItem === cat ? 'text-blue-300 cursor-grabbing' : ''}`}
                            title="Hold and drag to reorder"
                            aria-label={`Hold and drag ${cat} to reorder`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <span className="truncate flex-1">{cat}</span>
                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setEditingCat(cat);
                                setEditingCatValue(cat);
                              }}
                              className="p-1 text-[#8ea0ba] hover:text-blue-300 rounded"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); moveCategory(activeType, cat, 'up'); }}
                              className="w-7 h-7 sm:w-auto sm:h-auto sm:p-1 flex items-center justify-center text-[#8ea0ba] hover:text-blue-300 bg-[#18263b] sm:bg-transparent border border-[#26344b] sm:border-0 rounded-md"
                              title="Move category up"
                              aria-label={`Move ${cat} up`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); moveCategory(activeType, cat, 'down'); }}
                              className="w-7 h-7 sm:w-auto sm:h-auto sm:p-1 flex items-center justify-center text-[#8ea0ba] hover:text-blue-300 bg-[#18263b] sm:bg-transparent border border-[#26344b] sm:border-0 rounded-md"
                              title="Move category down"
                              aria-label={`Move ${cat} down`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (window.confirm(`Delete category "${cat}"?`)) {
                                  deleteCategory(activeType, cat);
                                  if (selectedCat === cat) setSelectedCat('');
                                }
                              }}
                              className="p-1 text-[#8ea0ba] hover:text-rose-400 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Subcategories Column */}
            <div className="p-3 rounded-xl bg-[#0d1728] border border-[#26344b] flex flex-col h-[310px] sm:h-[340px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8ea0ba] truncate">
                  2. Subcategories {selectedCat ? `for "${selectedCat}"` : ''}
                </div>
                {selectedCat && <span className="text-[9px] text-[#62738a] shrink-0">Hold ⋮⋮ & drag</span>}
              </div>

              {selectedCat ? (
                <>
                  {/* Add form */}
                  <form onSubmit={handleAddSubcategory} className="flex gap-1.5 mb-2.5">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      placeholder={`Add subcategory for ${selectedCat}...`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#142033] border border-[#26344b] text-xs text-white placeholder-[#62738a] focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ touchAction: draggingItem ? 'none' : 'pan-y' }} onPointerMove={handleDragMove} onPointerUp={finishDrag} onPointerCancel={cancelHoldDrag}>
                    {currentSubcategories.length > 0 ? (
                      currentSubcategories.map(sub => (
                        <div
                          key={sub}
                          data-reorder-kind="subcategory"
                          data-reorder-id={sub}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium bg-[#121c2d] hover:bg-[#18273f] text-[#c8d4e5] select-none transition-all ${
                            draggingItem === sub ? 'opacity-50 scale-[0.98]' : ''
                          } ${dragOverItem === sub && draggingItem !== sub ? 'border border-blue-400 bg-blue-500/15' : ''}`}
                        >
                          <button
                            type="button"
                            onPointerDown={e => { e.stopPropagation(); beginHoldDrag('subcategory', sub, e); }}
                            onPointerUp={e => { e.stopPropagation(); if (!draggingRef.current) cancelHoldDrag(); }}
                            onPointerCancel={e => { e.stopPropagation(); cancelHoldDrag(); }}
                            style={{ touchAction: 'none' }}
                            className={`p-1.5 mr-1 rounded-md text-[#62738a] hover:text-blue-300 hover:bg-[#18263b] shrink-0 cursor-grab ${draggingItem === sub ? 'text-blue-300 cursor-grabbing' : ''}`}
                            title="Hold and drag to reorder"
                            aria-label={`Hold and drag ${sub} to reorder`}
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <span className="truncate flex-1">{sub}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => { moveSubcategory(activeType, selectedCat, sub, 'up'); }}
                              className="w-7 h-7 sm:w-auto sm:h-auto sm:p-1 flex items-center justify-center text-[#8ea0ba] hover:text-blue-300 bg-[#18263b] sm:bg-transparent border border-[#26344b] sm:border-0 rounded-md"
                              title="Move subcategory up"
                              aria-label={`Move ${sub} up`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { moveSubcategory(activeType, selectedCat, sub, 'down'); }}
                              className="w-7 h-7 sm:w-auto sm:h-auto sm:p-1 flex items-center justify-center text-[#8ea0ba] hover:text-blue-300 bg-[#18263b] sm:bg-transparent border border-[#26344b] sm:border-0 rounded-md"
                              title="Move subcategory down"
                              aria-label={`Move ${sub} down`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete subcategory "${sub}"?`)) {
                                  deleteSubcategory(activeType, selectedCat, sub);
                                }
                              }}
                              className="p-1 text-[#8ea0ba] hover:text-rose-400 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-xs text-[#71839d]">
                        No subcategories yet for "{selectedCat}". Add one above!
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-xs text-[#71839d] p-4">
                  Select a category from the left to view and manage its subcategories.
                </div>
              )}
            </div>
          </div>

          {/* Reset button */}
          <div className="flex items-center justify-between pt-2 border-t border-[#26344b]">
            <button
              onClick={() => {
                if (window.confirm('Reset all categories and subcategories to initial default set?')) {
                  resetDefaultCategories();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-[#8ea0ba] hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              onClick={closeCategoryModal}
              className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
