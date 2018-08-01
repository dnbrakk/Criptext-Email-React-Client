import { connect } from 'react-redux';
import { addLabel } from '../actions';
import LabelEditView from '../components/LabelEdit';
import randomcolor from 'randomcolor';

const mapDispatchToProps = dispatch => {
  return {
    onAddLabel: (text, eventParams) => {
      if (eventParams) {
        const isByEvent = true;
        dispatch(addLabel(eventParams, isByEvent));
      } else {
        const color = randomcolor({
          seed: text,
          luminosity: 'bright'
        });
        const label = {
          text,
          color,
          visible: true
        };
        dispatch(addLabel(label));
      }
    }
  };
};

const LabelEdit = connect(
  null,
  mapDispatchToProps
)(LabelEditView);

export default LabelEdit;
