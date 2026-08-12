import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createTransform,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage/session';
import authReducer from './slices/authSlice';
import avatarReducer from './slices/avatarSlice';
import gmailReducer from './slices/gmailSlice';
import workerReducer from './slices/workerSlice';
import financialReducer from './slices/financialSlice';
import chatReducer from './slices/chatSlice';
import teamReducer from './slices/teamSlice';
import userContextReducer from './slices/userContextSlice';
import studioUserReducer from './slices/studioUserSlice';
import idgRfpReducer from './slices/idgRfpSlice';
import salesIntelReducer from './slices/salesIntelSlice';
import questionAssignmentsReducer from './slices/questionAssignmentsSlice';
import idgKnowledgeBaseReducer from './slices/idgKnowledgeBaseSlice';

const idgRfpPersistTransform = createTransform(
  (inbound: ReturnType<typeof idgRfpReducer>) => {
    const state = { ...inbound };

    for (const entry of Object.values(state.filesByAgentId ?? {})) {
      entry.fetching = false;
      entry.loading = false;
    }

    for (const entry of Object.values(state.fileById ?? {})) {
      entry.fetching = false;
      entry.loading = false;
    }

    state.apiPackById = (state.apiPackById ?? []).map((entry) => ({
      ...entry,
      fetching: false,
    }));

    return state;
  },
  (outbound) => outbound,
  { whitelist: ['idgRfp'] }
);

const idgRfpPersistConfig = {
  key: 'idgRfp',
  storage,
  transforms: [idgRfpPersistTransform],
};

const idgKnowledgeBasePersistConfig = {
  key: 'idgKnowledgeBase',
  storage,
};

const rootReducer = combineReducers({
  auth: authReducer,
  avatar: avatarReducer,
  worker: workerReducer,
  financial: financialReducer,
  chat: chatReducer,
  team: teamReducer,
  userContext: userContextReducer,
  studioUser: studioUserReducer,
  idgRfp: persistReducer(idgRfpPersistConfig, idgRfpReducer),
  salesIntel: salesIntelReducer,
  questionAssignments: questionAssignmentsReducer,
  idgKnowledgeBase: persistReducer(idgKnowledgeBasePersistConfig, idgKnowledgeBaseReducer),
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          'avatar/setAgents',
          'avatar/setSelectedAgent',
          'worker/setWorkers',
        ],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp', 'register', 'rehydrate'],
        ignoredPaths: ['items.dates'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
