import { describe, it, expect } from "vitest";
import { createBoardStore } from "./board-store";
import { createStore } from "zustand";

// Helper to create a generator that returns id-0, id-1, id-2...
const createMockIdGen = () => {
  let count = 0;
  return () => `id-${count++}`;
};

describe("Board Store - Initialization", () => {
  it("should initialize with 3 lanes and 9 total cards", () => {
    const idGenerator = createMockIdGen();
    const store = createStore(
      createBoardStore({ storeName: "test-board", idGenerator }),
    );
    const state = store.getState();

    expect(state.laneOrder).toHaveLength(3);
    expect(Object.keys(state.lanes)).toHaveLength(3);
    // 3 lanes * 3 cards each = 9 cards total
    expect(Object.keys(state.cards)).toHaveLength(9);

    // Check if cards are linked to the correct lane
    const firstLaneId = state.laneOrder[0];
    const firstCardId = state.lanes[firstLaneId].cards[0];
    expect(state.cards[firstCardId].laneId).toBe(firstLaneId);
  });
});

describe("Board Store - Actions", () => {
  it("should add a new lane", () => {
    const newLaneData = {
      title: "Backlog",
      considerCardDone: false,
      canRemove: true,
      canEdit: true,
      canAddCard: true,
      canEditCards: true,
      canRemoveCards: true,
    };

    const store = createStore(
      createBoardStore({ storeName: "test", idGenerator: createMockIdGen() }),
    );
    store.getState().actions.addLane(newLaneData);
    const state = store.getState();

    expect(state.laneOrder).toHaveLength(4);
    const lastLaneId = state.laneOrder[3];
    expect(state.lanes[lastLaneId].title).toBe("Backlog");
  });

  it("should update card content via updateCard", () => {
    const store = createStore(
      createBoardStore({ storeName: "test", idGenerator: createMockIdGen() }),
    );
    const state = store.getState();
    const targetCardId = Object.keys(state.cards)[0];

    store
      .getState()
      .actions.updateCard(targetCardId, { title: "Updated Title" });

    expect(store.getState().cards[targetCardId].title).toBe("Updated Title");
  });
});

describe("Board Store - syncBoardState", () => {
  it("should move a card between lanes and update its laneId", () => {
    const store = createStore(
      createBoardStore({ storeName: "test", idGenerator: createMockIdGen() }),
    );
    const initialState = store.getState();

    const lane1Id = initialState.laneOrder[0];
    const lane2Id = initialState.laneOrder[1];
    const cardToMoveId = initialState.lanes[lane1Id].cards[0];

    // Simulate Drag and Drop result:
    // Lane 1 loses its card, Lane 2 gains it
    const newDndState = {
      [lane1Id]: initialState.lanes[lane1Id].cards.slice(1),
      [lane2Id]: [cardToMoveId, ...initialState.lanes[lane2Id].cards],
    };

    store.getState().actions.syncBoardState(newDndState);

    const updatedState = store.getState();
    // 1. Check Lane 1 cards decreased
    expect(updatedState.lanes[lane1Id].cards).not.toContain(cardToMoveId);
    // 2. Check Lane 2 cards increased
    expect(updatedState.lanes[lane2Id].cards[0]).toBe(cardToMoveId);
    // 3. Crucial: check the card itself updated its internal laneId reference
    expect(updatedState.cards[cardToMoveId].laneId).toBe(lane2Id);
  });

  it("should remove orphaned cards during sync", () => {
    const store = createStore(
      createBoardStore({ storeName: "test", idGenerator: createMockIdGen() }),
    );
    const state = store.getState();

    // Pass a dndState that omits one card entirely
    const laneId = state.laneOrder[0];
    const cardToKeep = state.lanes[laneId].cards[0];

    store.getState().actions.syncBoardState({
      [laneId]: [cardToKeep],
    });

    const finalState = store.getState();
    expect(finalState.cards[cardToKeep]).toBeDefined();
    expect(Object.keys(finalState.cards).length).toBe(1); // All others were deleted
  });
});
