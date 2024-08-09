import React from 'react';

import CardList from '@/components/common/list/CardList';
import NormalList from '@/components/common/list/NormalList';

import { ListProps } from '@/types/internal/ListProps';

/**
 * List showing cards on mobile and normal list on larger screens
 *
 * {@link CardList} and {@link NormalList}
 */
const CardOrNormalList: React.FC<ListProps> = (props) => {
  return (
    <div id='card-or-normal-list'>
      <div className='block sm:hidden' id='card-list-on-small-screen'>
        <CardList {...props} />
      </div>
      <div className='hidden sm:block' id='card-list-on-large-screen'>
        <NormalList {...props} />
      </div>
    </div>
  );
};

export default CardOrNormalList;
