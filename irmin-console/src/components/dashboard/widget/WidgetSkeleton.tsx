import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import WidgetWrapper from '@/components/dashboard/widget/WidgetWrapper';

/**
 * Widget skeleton component
 *
 * @remarks
 *
 * This component is used to display a loading skeleton for all widgets.
 * It is used when the widget data is loading.
 */
const WidgetSkeleton = () => {
  return (
    <WidgetWrapper>
      <LoadingSkeleton className='h-80 w-full' />
    </WidgetWrapper>
  );
};

export default WidgetSkeleton;
