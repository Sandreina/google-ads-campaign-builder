import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Pin,
  PinOff,
  MoreVertical,
  Copy,
  Trash2,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Eye,
  EyeOff,
  MessageSquare,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdAsset, AdGroup, AssetType, ReviewStatus } from '@/types';
import { useStore } from '@/store/CampaignStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/primitives';
import { DropdownMenu, type MenuItem } from '@/components/ui/DropdownMenu';
import { ConfirmationDialog } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';
import { CharCount } from '@/components/shared/CharCount';
import { createAsset } from '@/lib/campaign-ops';
import { validateAsset, findDuplicateTexts, isDuplicateText, maxCharsFor } from '@/lib/validation';
import { RSA_LIMITS, HEADLINE_PIN_POSITIONS, DESCRIPTION_PIN_POSITIONS } from '@/lib/constants';
import { getAssetFeedback } from '@/lib/review';

export function AssetManager({ adGroup, type }: { adGroup: AdGroup; type: AssetType }) {
  const { mutateAdGroup, reviseAsset, review } = useStore();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({
    open: false,
    ids: [],
  });

  const assets = useMemo(
    () => [...(type === 'headline' ? adGroup.headlines : adGroup.descriptions)].sort((a, b) => a.order - b.order),
    [adGroup, type],
  );
  const dupes = useMemo(() => findDuplicateTexts(assets), [assets]);
  const max = type === 'headline' ? RSA_LIMITS.maxHeadlines : RSA_LIMITS.maxDescriptions;
  const pinPositions = type === 'headline' ? HEADLINE_PIN_POSITIONS : DESCRIPTION_PIN_POSITIONS;
  const label = type === 'headline' ? 'Headline' : 'Description';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function writeAssets(next: AdAsset[]) {
    const renumbered = next.map((a, i) => ({ ...a, order: i }));
    mutateAdGroup(adGroup.id, 'canEditAssets', (ag) =>
      type === 'headline' ? { ...ag, headlines: renumbered } : { ...ag, descriptions: renumbered },
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = assets.findIndex((a) => a.id === active.id);
    const newIndex = assets.findIndex((a) => a.id === over.id);
    mutateAdGroup(adGroup.id, 'canReorderAssets', (ag) => {
      const list = type === 'headline' ? ag.headlines : ag.descriptions;
      const sorted = [...list].sort((a, b) => a.order - b.order);
      const moved = arrayMove(sorted, oldIndex, newIndex).map((a, i) => ({ ...a, order: i }));
      return type === 'headline' ? { ...ag, headlines: moved } : { ...ag, descriptions: moved };
    });
  }

  function move(id: string, dir: 'up' | 'down' | 'top' | 'bottom') {
    const idx = assets.findIndex((a) => a.id === id);
    let to = idx;
    if (dir === 'up') to = idx - 1;
    else if (dir === 'down') to = idx + 1;
    else if (dir === 'top') to = 0;
    else to = assets.length - 1;
    if (to < 0 || to >= assets.length) return;
    writeAssets(arrayMove(assets, idx, to));
  }

  function patchAsset(id: string, patch: Partial<AdAsset>) {
    mutateAdGroup(adGroup.id, 'canEditAssets', (ag) => {
      const list = type === 'headline' ? ag.headlines : ag.descriptions;
      const updated = list.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a));
      return type === 'headline' ? { ...ag, headlines: updated } : { ...ag, descriptions: updated };
    });
  }

  function addBlank() {
    const next = createAsset(type, type === 'headline' ? 'New headline' : 'New description', assets.length);
    writeAssets([...assets, next]);
    setEditingId(next.id);
  }

  function duplicate(asset: AdAsset) {
    const copy = createAsset(type, asset.text, asset.order + 1);
    const next = [...assets];
    next.splice(asset.order + 1, 0, copy);
    writeAssets(next);
    toast(`${label} duplicated`);
  }

  function deleteAssets(ids: string[]) {
    writeAssets(assets.filter((a) => !ids.includes(a.id)));
    setSelected(new Set());
    toast(`${ids.length} ${label.toLowerCase()}${ids.length > 1 ? 's' : ''} deleted`);
  }

  function setPin(id: string, pin: number | null) {
    patchAsset(id, { pinPosition: pin });
  }

  function toggleSelected(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const bulkAction = (action: 'activate' | 'deactivate' | 'clearPin') => {
    const ids = [...selected];
    if (action === 'clearPin') ids.forEach((id) => setPin(id, null));
    else {
      mutateAdGroup(adGroup.id, 'canEditAssets', (ag) => {
        const list = type === 'headline' ? ag.headlines : ag.descriptions;
        const updated = list.map((a) =>
          selected.has(a.id) ? { ...a, active: action === 'activate' } : a,
        );
        return type === 'headline' ? { ...ag, headlines: updated } : { ...ag, descriptions: updated };
      });
    }
    toast(`Updated ${ids.length} ${label.toLowerCase()}s`);
    setSelected(new Set());
  };

  const overCapacity = assets.length > max;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}s</h3>
          <Badge tone={overCapacity ? 'destructive' : 'neutral'}>
            {assets.length} / {max}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={addBlank} disabled={assets.length >= max}>
          Add {label.toLowerCase()}
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-accent/40 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => bulkAction('activate')}>
            <Eye className="h-3.5 w-3.5" /> Activate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => bulkAction('deactivate')}>
            <EyeOff className="h-3.5 w-3.5" /> Deactivate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => bulkAction('clearPin')}>
            <PinOff className="h-3.5 w-3.5" /> Clear pins
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setConfirmDelete({ open: true, ids: [...selected] })}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {assets.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No {label.toLowerCase()}s yet. Use “Paste {label}s” or add one individually.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={assets.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {assets.map((asset, index) => (
                <SortableAssetCard
                  key={asset.id}
                  asset={asset}
                  index={index}
                  total={assets.length}
                  type={type}
                  pinPositions={[...pinPositions]}
                  duplicate={isDuplicateText(asset.text, dupes) && assets.findIndex((a) => a.text.trim().toLowerCase() === asset.text.trim().toLowerCase()) !== index}
                  selected={selected.has(asset.id)}
                  editing={editingId === asset.id}
                  reviewStatus={review?.adGroupReviews[adGroup.id] ? getAssetFeedback(review.adGroupReviews[adGroup.id], asset.id).status : 'pending'}
                  hasComment={!!review?.adGroupReviews[adGroup.id]?.assetFeedback[asset.id]?.comment?.trim()}
                  onToggleSelect={() => toggleSelected(asset.id)}
                  onStartEdit={() => setEditingId(asset.id)}
                  onStopEdit={() => setEditingId(null)}
                  onSaveText={(text) => {
                    reviseAsset(adGroup.id, type, asset.id, text);
                    setEditingId(null);
                  }}
                  onMove={(dir) => move(asset.id, dir)}
                  onDuplicate={() => duplicate(asset)}
                  onDelete={() => setConfirmDelete({ open: true, ids: [asset.id] })}
                  onToggleActive={() => patchAsset(asset.id, { active: !asset.active })}
                  onSetPin={(pin) => setPin(asset.id, pin)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmationDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, ids: [] })}
        onConfirm={() => deleteAssets(confirmDelete.ids)}
        title={`Delete ${confirmDelete.ids.length} ${label.toLowerCase()}${confirmDelete.ids.length > 1 ? 's' : ''}?`}
        message="This cannot be undone. Client feedback attached to these assets will also be removed."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

const STATUS_RING: Record<ReviewStatus, string> = {
  approved: 'border-l-success',
  changes_requested: 'border-l-destructive',
  pending: 'border-l-amber-400',
};

function SortableAssetCard({
  asset,
  index,
  total,
  type,
  pinPositions,
  duplicate,
  selected,
  editing,
  reviewStatus,
  hasComment,
  onToggleSelect,
  onStartEdit,
  onStopEdit,
  onSaveText,
  onMove,
  onDuplicate,
  onDelete,
  onToggleActive,
  onSetPin,
}: {
  asset: AdAsset;
  index: number;
  total: number;
  type: AssetType;
  pinPositions: number[];
  duplicate: boolean;
  selected: boolean;
  editing: boolean;
  reviewStatus: ReviewStatus;
  hasComment: boolean;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onSaveText: (text: string) => void;
  onMove: (dir: 'up' | 'down' | 'top' | 'bottom') => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onSetPin: (pin: number | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: asset.id,
  });
  const [draft, setDraft] = useState(asset.text);
  const validation = validateAsset(asset, { duplicate });
  const max = maxCharsFor(type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const menuItems: MenuItem[] = [
    { label: 'Edit', icon: <Check className="h-4 w-4" />, onSelect: onStartEdit },
    { label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onSelect: onDuplicate },
    {
      label: asset.active ? 'Deactivate' : 'Activate',
      icon: asset.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
      onSelect: onToggleActive,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onSelect: onDelete,
      destructive: true,
      separatorBefore: true,
    },
  ];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border border-l-4 border-border bg-card shadow-soft transition-shadow',
        STATUS_RING[reviewStatus],
        isDragging && 'shadow-card',
        !asset.active && 'opacity-60',
        selected && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-2 p-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Select ${type} ${index + 1}`}
          className="mt-1 h-4 w-4 rounded border-input text-primary"
        />
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={draft}
                autoFocus
                rows={2}
                maxLength={max + 40}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSaveText(draft);
                  if (e.key === 'Escape') {
                    setDraft(asset.text);
                    onStopEdit();
                  }
                }}
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <CharCount count={draft.trim().length} max={max} />
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(asset.text);
                    onStopEdit();
                  }}
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button size="sm" onClick={() => onSaveText(draft)}>
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={onStartEdit} className="block w-full text-left">
              <p className="break-words text-sm leading-snug">{asset.text || <span className="italic text-muted-foreground">Empty</span>}</p>
            </button>
          )}

          {!editing && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <CharCount count={asset.text.trim().length} max={max} />
              {validation.state === 'over_limit' && <Badge tone="destructive">Over limit</Badge>}
              {validation.state === 'near_limit' && <Badge tone="warning">Near limit</Badge>}
              {validation.state === 'empty' && <Badge tone="warning">Empty</Badge>}
              {duplicate && <Badge tone="warning">Duplicate</Badge>}
              {!asset.active && <Badge tone="neutral">Inactive</Badge>}
              {asset.pinPosition ? (
                <Badge tone="info">
                  <Pin className="h-3 w-3" /> Pin {asset.pinPosition}
                </Badge>
              ) : null}
              {asset.revisedAfterReview && (
                <Tooltip content="Edited after the client reviewed it — status reset to pending.">
                  <Badge tone="primary">
                    <History className="h-3 w-3" /> Updated after review
                  </Badge>
                </Tooltip>
              )}
              {reviewStatus !== 'pending' && (
                <Badge tone={reviewStatus === 'approved' ? 'success' : 'destructive'}>
                  {reviewStatus === 'approved' ? 'Client approved' : 'Changes requested'}
                </Badge>
              )}
              {hasComment && (
                <Tooltip content="Client left a comment on this asset">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </Tooltip>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {/* Pin selector */}
          <PinSelector value={asset.pinPosition ?? null} positions={pinPositions} onChange={onSetPin} />
          {/* Accessible move buttons */}
          <div className="hidden flex-col sm:flex">
            <button
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onMove('up')}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              aria-label="Move down"
              disabled={index === total - 1}
              onClick={() => onMove('down')}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <DropdownMenu
            trigger={<MoreVertical className="h-4 w-4" />}
            items={[
              { label: 'Move to top', icon: <ChevronsUp className="h-4 w-4" />, onSelect: () => onMove('top') },
              { label: 'Move to bottom', icon: <ChevronsDown className="h-4 w-4" />, onSelect: () => onMove('bottom') },
              ...menuItems,
            ]}
          />
        </div>
      </div>
    </li>
  );
}

function PinSelector({
  value,
  positions,
  onChange,
}: {
  value: number | null;
  positions: number[];
  onChange: (pin: number | null) => void;
}) {
  return (
    <Tooltip content="Pin this asset to a fixed position">
      <select
        aria-label="Pin position"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={cn(
          'h-7 rounded border border-input bg-card px-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value && 'text-primary',
        )}
      >
        <option value="">Unpinned</option>
        {positions.map((p) => (
          <option key={p} value={p}>
            Pin {p}
          </option>
        ))}
      </select>
    </Tooltip>
  );
}
