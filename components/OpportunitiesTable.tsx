'use client';

import React, { useState, useMemo } from 'react';
import { formatDate, formatNumber } from '@/lib/utils/dateFormat';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ExpandedState,
} from '@tanstack/react-table';
import { FormattedOpportunity } from '@/lib/services/searchService';

interface OpportunitiesTableProps {
  data: FormattedOpportunity[];
  loading: boolean;
}

export default function OpportunitiesTable({ data, loading }: OpportunitiesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'closing_date', desc: false }
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<FormattedOpportunity>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          if (!row.original.hasItbDetails) return null;
          return (
            <button
              onClick={row.getToggleExpandedHandler()}
              className="px-2 py-1 text-primary-900 hover:bg-primary-50 rounded"
            >
              {row.getIsExpanded() ? '▼' : '▶'}
            </button>
          );
        },
        size: 40,
      },
      {
        accessorKey: 'reference_number',
        header: 'Reference #',
        cell: ({ getValue, row }) => {
          const value = getValue() as string;
          const url = row.original.detail_url;
          if (url) {
            return (
              <a href={url} target="_blank" rel="noopener noreferrer" 
                className="text-primary-900 hover:underline font-medium">
                {value}
              </a>
            );
          }
          return value;
        },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <div className="max-w-xs truncate" title={value}>
              {value}
            </div>
          );
        },
      },
      {
        accessorKey: 'procuring_entity',
        header: 'Procuring Entity',
      },
      {
        accessorKey: 'category',
        header: 'Category',
      },
      {
        accessorKey: 'area_of_delivery',
        header: 'Area',
        cell: ({ getValue }) => getValue() || 'N/A',
      },
      {
        accessorKey: 'formatted_budget',
        header: 'Budget',
      },
      {
        accessorKey: 'closing_date',
        header: 'Closing Date',
        cell: ({ getValue, row }) => {
          const formatted = formatDate(getValue() as string);
          const daysLeft = row.original.days_until_closing;
          
          let badge = null;
          if (daysLeft < 0) {
            badge = <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Expired</span>;
          } else if (daysLeft <= 3) {
            badge = <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Closing Soon</span>;
          } else {
            badge = <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Active</span>;
          }
          
          return (
            <div className="flex items-center">
              {formatted}
              {badge}
            </div>
          );
        },
      },
      {
        accessorKey: 'days_until_closing',
        header: 'Days Left',
        cell: ({ getValue }) => {
          const days = getValue() as number;
          if (days < 0) return <span className="text-red-600">Expired</span>;
          if (days === 0) return <span className="text-yellow-600">Today</span>;
          return `${days} days`;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.hasItbDetails,
  });

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
          <p className="mt-4 text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-700">No results found</h3>
          <p className="mt-2 text-gray-600">Try adjusting your search criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-primary-900 mb-6">
        Search Results ({data.length} opportunities)
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {{
                            asc: '▲',
                            desc: '▼',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={columns.length} className="bg-gray-50 px-6 py-4">
                      <ItbDetails opportunity={row.original} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </button>
          <button
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
          <button
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="px-3 py-1 border rounded"
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ItbDetails({ opportunity }: { opportunity: FormattedOpportunity }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-lg font-semibold text-primary-900 mb-4">ITB Details</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunity.solicitation_number && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Solicitation Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.solicitation_number}</dd>
          </div>
        )}
        
        {opportunity.procurement_mode && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Procurement Mode</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.procurement_mode}</dd>
          </div>
        )}
        
        {opportunity.funding_source && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Funding Source</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.funding_source}</dd>
          </div>
        )}
        
        {opportunity.delivery_period && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Delivery Period</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.delivery_period}</dd>
          </div>
        )}
        
        {opportunity.contact_person && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.contact_person}</dd>
          </div>
        )}
        
        {opportunity.contact_email && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.contact_email}</dd>
          </div>
        )}
        
        {opportunity.pre_bid_conference && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Pre-bid Conference</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.pre_bid_conference}</dd>
          </div>
        )}
        
        {opportunity.bid_documents_fee && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Documents Fee</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.bid_documents_fee}</dd>
          </div>
        )}
        
        {opportunity.trade_agreement && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Trade Agreement</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.trade_agreement}</dd>
          </div>
        )}
        
        {opportunity.classification && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Classification</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.classification}</dd>
          </div>
        )}
        
        {opportunity.contact_designation && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Designation</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.contact_designation}</dd>
          </div>
        )}
        
        {opportunity.contact_address && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.contact_address}</dd>
          </div>
        )}
        
        {opportunity.bid_submission_deadline && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Submission Deadline</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.bid_submission_deadline)}</dd>
          </div>
        )}
        
        {opportunity.bid_opening_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Opening Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.bid_opening_date)}</dd>
          </div>
        )}
        
        {opportunity.date_published && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Date Published</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.date_published}</dd>
          </div>
        )}
        
        {opportunity.client_agency && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Client Agency</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.client_agency}</dd>
          </div>
        )}
        
        {opportunity.bac_chairman && (
          <div>
            <dt className="text-sm font-medium text-gray-500">BAC Chairman</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.bac_chairman}</dd>
          </div>
        )}
        
        {opportunity.bac_secretariat && (
          <div>
            <dt className="text-sm font-medium text-gray-500">BAC Secretariat</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.bac_secretariat}</dd>
          </div>
        )}
        
        {opportunity.created_by && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Created By</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.created_by}</dd>
          </div>
        )}
        
        {opportunity.bid_supplements !== undefined && opportunity.bid_supplements > 0 && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Supplements</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.bid_supplements}</dd>
          </div>
        )}
        
        {opportunity.document_request_list !== undefined && opportunity.document_request_list > 0 && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Document Request List</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.document_request_list}</dd>
          </div>
        )}
        
        {opportunity.status && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.status}</dd>
          </div>
        )}
        
        {opportunity.last_updated && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.last_updated}</dd>
          </div>
        )}
      </div>
      
      {opportunity.description && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Description</dt>
          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{opportunity.description}</dd>
        </div>
      )}
      
      {opportunity.eligibility_requirements && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Eligibility Requirements</dt>
          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{opportunity.eligibility_requirements}</dd>
        </div>
      )}
      
      {(opportunity.source_url || opportunity.detail_url) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <dt className="text-sm font-medium text-gray-500 mb-2">Links</dt>
          {opportunity.detail_url && (
            <dd className="mt-1 text-sm">
              <a href={opportunity.detail_url} target="_blank" rel="noopener noreferrer" 
                className="text-primary-900 hover:underline">
                View on PhilGEPS →
              </a>
            </dd>
          )}
          {opportunity.source_url && opportunity.source_url !== opportunity.detail_url && (
            <dd className="mt-1 text-sm">
              <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer" 
                className="text-primary-900 hover:underline">
                Source Page →
              </a>
            </dd>
          )}
        </div>
      )}
    </div>
  );
}