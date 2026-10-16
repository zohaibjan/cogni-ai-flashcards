import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import GradientButton from './GradientButton';

describe('GradientButton', () => {
  it('renders title and handles press', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <GradientButton title="Go" onPress={onPress} />,
    );

    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    const { queryByText, getByTestId } = render(
      <GradientButton title="Run" onPress={onPress} loading />,
    );

    expect(queryByText('Run')).toBeNull();
    fireEvent.press(getByTestId('gradient-button-touchable'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
