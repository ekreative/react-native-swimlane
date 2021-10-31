import noop from 'lodash/noop';
import React, { useEffect, useRef } from 'react';
import { LayoutRectangle, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { Draggable } from './types';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useDrag } from './Swimlane';

interface DropInViewProps extends Draggable {
  column: number;
  section: number;
  rowIndex: number;
  row: any;
  shouldAnimate: boolean;
  isHovered?: boolean;
  parentView?: any;
  canDropIn?: boolean;
  canBeDragged?: boolean;
  isDragging?: boolean;
  onLayout?: (frame: LayoutRectangle, id: number) => void;
  onPosition?: (x: number, y: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const DropInViewComponent: React.FC<DropInViewProps> = ({
  children,
  parentView,
  onLayout = noop,
  column,
  section,
  row,
  rowIndex,
  canDropIn = false,
}) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pressed = useSharedValue(false);
  const rootRef = useRef<View>(null);
  const originFrame = useSharedValue<LayoutRectangle | null>(null);
  const {
    startDrag,
    endDrag,
    onItemFrame,
    offsetX,
    offsetY,
    startX,
    startY,
    screenOffsetX,
    screenOffsetY,
  } = useDrag();
  const isMounted = useRef(false);

  const calcSize = () => {
    if (parentView && rootRef.current) {
      rootRef.current.measureLayout(
        parentView,
        (dropInX, dropInY, width, height) => {
          onItemFrame(section, column, rowIndex, row?.id || '-1', {
            x: dropInX,
            y: dropInY,
            width,
            height,
          });
          originFrame.value = { x: dropInX, y: dropInY, width, height };
          onLayout({ x: dropInX, y: dropInY, width, height }, row?.id || '-1');
        },
        noop
      );
    }
  };

  const prepareToDrag = () => {
    pressed.value = true;
    rootRef.current?.measureLayout(
      parentView,
      (dropInX, dropInY, width, height) => {
        onItemFrame(section, column, rowIndex, row?.id || '-1', {
          x: dropInX,
          y: dropInY,
          width,
          height,
        });
        startDrag({
          column,
          section,
          info: row,
          row: rowIndex,
          startFrame: { x: dropInX, y: dropInY, width, height },
        });
      },
      noop
    );
  };

  const eventHandler = useAnimatedGestureHandler({
    onStart: () => {
      pressed.value = true;
      // onDragStart();
      runOnJS(prepareToDrag)();
      startX.value = originFrame.value?.x || 0;
      startY.value = originFrame.value?.y || 0;
    },
    onActive: (event) => {
      offsetX.value = event.translationX;
      offsetY.value = event.translationY;

      x.value = event.translationX;
      y.value = event.translationY;

      screenOffsetX.value = event.absoluteX;
      screenOffsetY.value = event.absoluteY;
    },
    onEnd: () => {
      pressed.value = false;
      x.value = 0;
      y.value = 0;

      offsetX.value = 0;
      offsetY.value = 0;

      screenOffsetX.value = 0;
      screenOffsetY.value = 0;

      runOnJS(endDrag)();
      runOnJS(calcSize)();
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pressed.value ? 0 : 1,
      transform: [
        {
          translateX: x.value,
        },
        {
          translateY: y.value,
        },
      ],
    };
  });

  const animatedHover = useAnimatedStyle(() => {
    return {
      backgroundColor: canDropIn ? 'green' : 'transparent',
    };
  }, [canDropIn]);

  useEffect(() => {
    pressed.value = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column, section, JSON.stringify(row), rowIndex]);

  useEffect(() => {
    calcSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentView, rootRef.current, column, section, endDrag, rowIndex]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <Animated.View style={[animatedHover]}>
      <View ref={rootRef}>
        <Animated.View style={[animatedStyle]}>
          {row && (
            <PanGestureHandler onGestureEvent={eventHandler}>
              <Animated.View>
                <Text>Drag</Text>
              </Animated.View>
            </PanGestureHandler>
          )}
          <View>{children}</View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};
