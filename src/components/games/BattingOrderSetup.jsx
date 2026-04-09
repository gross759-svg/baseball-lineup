import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function BattingOrderSetup({ players = [], initialOrder, onConfirm, saving }) {
  const [order, setOrder] = useState(() => initialOrder ? [...initialOrder] : [...players])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrder(prev => {
      const oldIndex = prev.findIndex(p => p.id === active.id)
      const newIndex = prev.findIndex(p => p.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function toggle(playerId) {
    const exists = order.find(p => p.id === playerId)
    if (exists) {
      setOrder(prev => prev.filter(p => p.id !== playerId))
    } else {
      const player = players.find(p => p.id === playerId)
      if (player) setOrder(prev => [...prev, player])
    }
  }

  const includedIds = new Set(order.map(p => p.id))
  const excluded = players.filter(p => !includedIds.has(p.id))

  return (
    <div>
      <p className="text-sm text-muted mb-12">
        Drag to reorder. Tap ✕ to mark a player as not playing today.
      </p>

      {order.length === 0 && (
        <div className="alert alert--warn">Add at least one player to the lineup.</div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <ol className="order-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {order.map((player, idx) => (
              <SortableItem
                key={player.id}
                player={player}
                index={idx}
                onRemove={() => toggle(player.id)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {excluded.length > 0 && (
        <div className="mt-16">
          <div className="section-title text-sm text-muted mb-8">Not playing today</div>
          {excluded.map(player => (
            <div key={player.id} className="order-item" style={{ opacity: 0.6 }}>
              <span className="jersey-badge" style={{ width: 26, height: 26, fontSize: '0.6875rem' }}>
                {player.jersey_number ?? '—'}
              </span>
              <span className="order-item__name">{player.name}</span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => toggle(player.id)}
              >
                Add back
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn--primary btn--full mt-16"
        onClick={() => onConfirm(order.map(p => p.id))}
        disabled={saving || order.length === 0}
      >
        {saving ? 'Saving…' : 'Save batting order'}
      </button>
    </div>
  )
}

function SortableItem({ player, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }

  return (
    <li ref={setNodeRef} style={style} className="order-item">
      <span
        {...attributes}
        {...listeners}
        className="drag-handle"
        aria-label="Drag to reorder"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          color: 'var(--gray-400)',
          fontSize: '1.1rem',
          paddingRight: 4,
          userSelect: 'none',
        }}
      >
        ⠿
      </span>
      <span className="order-item__num">{index + 1}</span>
      <span className="jersey-badge" style={{ width: 26, height: 26, fontSize: '0.6875rem' }}>
        {player.jersey_number ?? '—'}
      </span>
      <span className="order-item__name">{player.name}</span>
      <button
        type="button"
        className="btn btn--danger btn--sm"
        onClick={onRemove}
        aria-label="Remove from game"
      >✕</button>
    </li>
  )
}
