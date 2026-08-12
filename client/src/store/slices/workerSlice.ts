import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DigitalWorker } from '@/types/worker';

interface WorkerState {
  workers: DigitalWorker[];
  selectedWorker: DigitalWorker | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkerState = {
  workers: [],
  selectedWorker: null,
  loading: false,
  error: null,
};

const workerSlice = createSlice({
  name: 'worker',
  initialState,
  reducers: {
    setWorkers: (state, action: PayloadAction<DigitalWorker[]>) => {
      state.workers = action.payload;
    },
    setSelectedWorker: (state, action: PayloadAction<DigitalWorker | null>) => {
      state.selectedWorker = action.payload;
    },
    updateWorker: (state, action: PayloadAction<Partial<DigitalWorker> & { id: number }>) => {
      const { id, ...updates } = action.payload;
      const index = state.workers.findIndex((w) => w.id === id);
      if (index !== -1) {
        state.workers[index] = { ...state.workers[index], ...updates };
      }
      if (state.selectedWorker?.id === id) {
        state.selectedWorker = { ...state.selectedWorker, ...updates };
      }
    },
    addWorker: (state, action: PayloadAction<DigitalWorker>) => {
      state.workers.push(action.payload);
    },
    removeWorker: (state, action: PayloadAction<number>) => {
      state.workers = state.workers.filter((w) => w.id !== action.payload);
      if (state.selectedWorker?.id === action.payload) {
        state.selectedWorker = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setWorkers,
  setSelectedWorker,
  updateWorker,
  addWorker,
  removeWorker,
  setLoading,
  setError,
} = workerSlice.actions;

export default workerSlice.reducer;
