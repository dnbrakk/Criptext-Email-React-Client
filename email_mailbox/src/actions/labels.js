import { Label } from './types';
import { getAllLabels } from '../utils/electronInterface';
const inLabel = 10;

export const addLabels = labels => {
  return {
    type: Label.ADD_BATCH,
    labels: labels
  };
};

export const addLabel = label => {
  const labels = {
    inLabel: {
      id: inLabel,
      text: label
    }
  };
  return {
    type: Label.ADD_BATCH,
    labels: labels
  };
};

export const loadLabels = () => {
  return async dispatch => {
    try {
      const dbLabels = await getAllLabels();
      const labels = {};
      dbLabels.forEach(element => {
        labels[element.id] = {
          id: element.id,
          text: element.text
        };
      });
      dispatch(addLabels(labels));
    } catch (e) {
      // TO DO
    }
  };
};