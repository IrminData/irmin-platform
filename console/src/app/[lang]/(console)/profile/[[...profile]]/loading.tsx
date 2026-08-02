import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

/**
 * Mirror skeleton for `ProfileSection` → `UserProfileForm`.
 *
 * Real structure (see `src/components/user/UserProfileForm.tsx`):
 * - `ContentWrapper wrapperClassName='py-8'` — `container max-w-7xl
 *   px-2 sm:mx-auto` outer + `rounded-lg border bg-popover/10 p-2`
 *   inner card.
 * - Two-column grid `grid-cols-1 lg:grid-cols-2 gap-8`.
 * - Left column: avatar + profile-picture input + first/last name row
 *   + email + phone + company + language selector + submit button.
 * - Right column: `NotificationsInbox` — a list of notification rows.
 *
 * The previous `<FormSkeleton fieldCount={6} />` rendered a narrow
 * single-column `max-w-3xl` form, which didn't match the real wide
 * two-column layout at all.
 */
export default function ProfileLoading() {
  return (
    <div
      className={`
        relative container my-8 max-w-7xl px-2
        sm:mx-auto
      `}
    >
      <div
        className={`
          w-full max-w-full rounded-lg border border-border bg-popover/10 p-2
          py-8
        `}
      >
        <div
          className={`
            grid grid-cols-1 gap-8
            lg:grid-cols-2
          `}
        >
          {/* Left: avatar + form fields */}
          <div className='space-y-4'>
            <div className='flex justify-center'>
              <LoadingSkeleton className='size-24 rounded-full' />
            </div>
            <div className='space-y-4'>
              {/* Profile-picture input */}
              <div className='flex flex-col gap-2'>
                <LoadingSkeleton className='h-4 w-40' />
                <LoadingSkeleton className='h-10 w-full rounded-md' />
              </div>
              {/* First + last name row */}
              <div
                className={`
                  grid grid-cols-1 gap-4
                  md:grid-cols-2
                `}
              >
                <div className='flex flex-col gap-2'>
                  <LoadingSkeleton className='h-4 w-24' />
                  <LoadingSkeleton className='h-10 w-full rounded-md' />
                </div>
                <div className='flex flex-col gap-2'>
                  <LoadingSkeleton className='h-4 w-24' />
                  <LoadingSkeleton className='h-10 w-full rounded-md' />
                </div>
              </div>
              {/* Email / phone / company / language — four stacked fields */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`field-${i}`} className='flex flex-col gap-2'>
                  <LoadingSkeleton className='h-4 w-28' />
                  <LoadingSkeleton className='h-10 w-full rounded-md' />
                </div>
              ))}
              {/* Submit */}
              <LoadingSkeleton className='h-9 w-full rounded-md' />
            </div>
          </div>

          {/* Right: NotificationsInbox — header + run of rows */}
          <div className='space-y-4'>
            <LoadingSkeleton className='h-6 w-40' />
            <div className='space-y-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingSkeleton
                  key={`notification-${i}`}
                  className='h-16 w-full rounded-md'
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
