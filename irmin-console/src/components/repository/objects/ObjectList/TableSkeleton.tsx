import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Skeleton for the repository object table
 */
export function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-[300px]'>
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
        {[...Array(5)].map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <LoadingSkeleton className='h-4 w-[250px]' />
            </TableCell>
            <TableCell>
              <LoadingSkeleton className='h-4 w-[100px]' />
            </TableCell>
            <TableCell>
              <LoadingSkeleton className='h-4 w-[100px]' />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
