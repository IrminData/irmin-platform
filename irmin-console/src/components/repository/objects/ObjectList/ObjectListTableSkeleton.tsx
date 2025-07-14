import { memo } from 'react';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ObjectListTableRowSkeleton = () => {
  return (
    <TableRow>
      <TableCell>
        <LoadingSkeleton className='h-4 w-[250px]' />
      </TableCell>
    </TableRow>
  );
};

/**
 * Skeleton for the repository object list table
 */
function ObjectListTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <LoadingSkeleton className='h-4 w-[100px]' />
          </TableHead>
          <TableHead>
            <LoadingSkeleton className='h-4 w-[100px]' />
          </TableHead>
          <TableHead>
            <LoadingSkeleton className='h-4 w-[100px]' />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <ObjectListTableRowSkeleton />
        <ObjectListTableRowSkeleton />
        <ObjectListTableRowSkeleton />
        <ObjectListTableRowSkeleton />
        <ObjectListTableRowSkeleton />
      </TableBody>
    </Table>
  );
}

export default memo(ObjectListTableSkeleton);
