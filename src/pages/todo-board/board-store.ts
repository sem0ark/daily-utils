import { immer } from "zustand/middleware/immer";
import { v4 as uuid4 } from "uuid";

import { createStoreContext, type SetState } from "../../common/store-utils";
import { persist } from "zustand/middleware";
import { ID } from "../../common/types";

export interface Lane {
  id: ID;
  title: string;
  cards: ID[];

  considerCardDone: boolean;
  canRemove: boolean;
  canEdit: boolean;

  canEditCards: boolean;
  canAddCard: boolean;
  canRemoveCards: boolean;
}

export interface Card {
  id: ID;
  laneId: ID;

  title: string;
  description: string;
  dueDate?: string; // Optional ISO date
}

const getDefaultLanes = (idGenerator: () => string): Record<ID, Lane> => {
  const ids = [idGenerator(), idGenerator(), idGenerator()];
  const titles = ["To Do", "In Progress", "Done"];

  return ids.reduce(
    (acc, id, i) => {
      acc[id] = {
        id,
        title: titles[i],
        cards: [],
        considerCardDone: titles[i] === "Done",
        canRemove: titles[i] === "To Do",
        canEdit: titles[i] === "To Do",
        canAddCard: titles[i] !== "Done",
        canEditCards: titles[i] !== "Done",
        canRemoveCards: true,
      };
      return acc;
    },
    {} as Record<ID, Lane>,
  );
};

export const createBoardStore = ({
  storeName,
  idGenerator,
}: {
  storeName: string;
  idGenerator: () => string;
}) => {
  const initialLanes = getDefaultLanes(idGenerator);
  const initialCards: Record<ID, Card> = {};
  const laneOrder: ID[] = Object.keys(initialLanes);

  laneOrder.forEach((laneId) => {
    const lane = initialLanes[laneId];
    for (let i = 1; i <= 3; i++) {
      const cardId = idGenerator();
      lane.cards.push(cardId);
      initialCards[cardId] = {
        id: cardId,
        laneId,
        title: `${lane.title} ${i}`,
        description: "Sample description",
      };
    }
  });

  function store(set: SetState<typeof store>) {
    return {
      storeName,
      laneOrder,
      lanes: initialLanes,
      cards: initialCards,

      actions: {
        addLane: (lane: Omit<Lane, "id" | "cards">): Lane => {
          const id = idGenerator();
          const newLane = { ...lane, id, cards: [] };

          set((state) => {
            state.lanes[id] = newLane;
            state.laneOrder.push(id);
          });

          return newLane;
        },

        updateLane: (id: ID, updates: Partial<Lane>) =>
          set((state) => {
            if (state.lanes[id]) Object.assign(state.lanes[id], updates);
          }),

        addCard: (laneId: ID, card: Omit<Card, "id" | "laneId">): Card => {
          const id = idGenerator();
          const newCard = { ...card, id, laneId };

          set((state) => {
            state.cards[id] = newCard;
            state.lanes[laneId]?.cards.push(id);
          });

          return newCard;
        },

        updateCard: (id: ID, updates: Partial<Card>) =>
          set((state) => {
            if (state.cards[id]) Object.assign(state.cards[id], updates);
          }),

        /**
         * Declarative Board Sync
         * @param dndItems - Map of LaneID to ordered CardIDs
         * @param newLaneOrder - Optional new order of LaneIDs
         */
        syncBoardState: (dndItems: Record<ID, ID[]>, newLaneOrder?: ID[]) =>
          set((state) => {
            if (newLaneOrder) state.laneOrder = newLaneOrder;

            Object.entries(dndItems).forEach(([laneId, cardIds]) => {
              if (state.lanes[laneId]) {
                state.lanes[laneId].cards = cardIds;
                // Ensure cards know which lane they are in
                cardIds.forEach((cId) => {
                  if (state.cards[cId]) state.cards[cId].laneId = laneId;
                });
              }
            });

            // Cleanup: Remove cards that no longer exist in any lane
            const activeCardIds = new Set(Object.values(dndItems).flat());
            Object.keys(state.cards).forEach((id) => {
              if (!activeCardIds.has(id)) delete state.cards[id];
            });
          }),
      },
    };
  }

  return immer(store);
};

const createBoardStorePersisted = ({ storeName }: { storeName: string }) =>
  persist(createBoardStore({ storeName, idGenerator: uuid4 }), {
    name: `board-store-${storeName}`,
    version: 1,
    partialize: (state) => ({
      laneOrder: state.laneOrder,
      lanes: state.lanes,
      cards: state.cards,
    }),
  });

export const {
  useStore: useBoardStore,
  useStoreShallow: useBoardStoreShallow,
  useGetStoreState: useGetBoardState,
  StoreProvider: BoardStoreProvider,
} = createStoreContext(createBoardStorePersisted);

export const useBoardStoreActions = () =>
  useBoardStore((state) => state.actions);

export const useLane = (laneId: ID) =>
  useBoardStore((state) => state.lanes[laneId]);

export const useCard = (cardId: ID) =>
  useBoardStore((state) => state.cards[cardId]);

export const useLaneOrder = () => useBoardStore((state) => state.laneOrder);

export const useIsCardDone = (cardId: ID) => {
  return useBoardStore((state) => {
    const card = state.cards[cardId];
    if (!card) return false;
    return state.lanes[card.laneId]?.considerCardDone ?? false;
  });
};

export const useCanRemoveCard = (cardId: ID) => {
  return useBoardStore((state) => {
    const card = state.cards[cardId];
    if (!card) return false;
    return state.lanes[card.laneId]?.canRemoveCards ?? false;
  });
};
