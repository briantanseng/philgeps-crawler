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
import CopyButton from './CopyButton';

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
          if (!row.original.hasItbDetails && !row.original.hasRfqDetails) return null;
          return (
            <button
              onClick={row.getToggleExpandedHandler()}
              className="px-2 py-1 text-primary-900 hover:bg-primary-50 rounded transition-all duration-200 hover:scale-110"
              title={row.getIsExpanded() ? 'Hide details' : 'Show ITB/RFQ details'}
            >
              <span className={`inline-block transition-transform duration-200 ${row.getIsExpanded() ? 'rotate-90' : ''}`}>
                ▶
              </span>
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
          const hasDetails = row.original.hasItbDetails || row.original.hasRfqDetails;
          
          return (
            <div className="flex items-center gap-2">
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" 
                  className="text-primary-900 hover:underline font-medium">
                  {value}
                </a>
              ) : (
                value
              )}
              {hasDetails && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title="Has ITB/RFQ details">
                  ITB
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => {
          const value = getValue() as string;
          
          return (
            <div className="flex items-center gap-2 max-w-md">
              <div className="flex-1 truncate" title={value}>
                {value}
              </div>
              <CopyButton text={value} />
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
    getRowCanExpand: (row) => row.original.hasItbDetails || row.original.hasRfqDetails,
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
                <tr className={`hover:bg-gray-50 ${(row.original.hasItbDetails || row.original.hasRfqDetails) ? 'cursor-pointer' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={columns.length} className="bg-gray-50 px-6 py-4">
                      <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                        {row.original.hasItbDetails && <ItbDetails opportunity={row.original} />}
                        {row.original.hasRfqDetails && <RfqDetails opportunity={row.original} />}
                      </div>
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
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h4 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Invitation to Bid Details
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunity.itb_solicitation_number && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Solicitation Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_solicitation_number}</dd>
          </div>
        )}
        
        {opportunity.itb_procurement_mode && (
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Procurement Mode</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_procurement_mode}</dd>
          </div>
        )}
        
        {opportunity.itb_trade_agreement && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Trade Agreement</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_trade_agreement}</dd>
          </div>
        )}
        
        {opportunity.itb_classification && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Classification</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_classification}</dd>
          </div>
        )}
        
        {opportunity.itb_category && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Category</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_category}</dd>
          </div>
        )}
        
        {opportunity.itb_approved_budget && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Approved Budget</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(opportunity.itb_approved_budget)}
            </dd>
          </div>
        )}
        
        {opportunity.itb_delivery_period && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Delivery Period</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_delivery_period}</dd>
          </div>
        )}
        
        {opportunity.itb_area_of_delivery && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Area of Delivery</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_area_of_delivery}</dd>
          </div>
        )}
        
        {opportunity.itb_client_agency && (
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Client Agency</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_client_agency}</dd>
          </div>
        )}
        
        {opportunity.itb_contact_person && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_contact_person}</dd>
          </div>
        )}
        
        {opportunity.itb_contact_designation && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Designation</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_contact_designation}</dd>
          </div>
        )}
        
        {opportunity.itb_contact_phone && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_contact_phone}</dd>
          </div>
        )}
        
        {opportunity.itb_contact_email && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_contact_email}</dd>
          </div>
        )}
        
        {opportunity.itb_contact_address && (
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Contact Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_contact_address}</dd>
          </div>
        )}
        
        {opportunity.itb_closing_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Submission Deadline</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.itb_closing_date)}</dd>
          </div>
        )}
        
        {opportunity.itb_opening_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Opening Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.itb_opening_date)}</dd>
          </div>
        )}
        
        {opportunity.itb_pre_bid_conference && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Pre-bid Conference</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_pre_bid_conference}</dd>
          </div>
        )}
        
        {opportunity.itb_bidding_documents && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Documents Fee</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_bidding_documents}</dd>
          </div>
        )}
        
        {opportunity.itb_date_posted && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Date Posted</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_date_posted}</dd>
          </div>
        )}
        
        {opportunity.itb_date_last_updated && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_date_last_updated}</dd>
          </div>
        )}
        
        {opportunity.itb_status && (
          <div>
            <dt className="text-sm font-medium text-gray-500">ITB Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_status}</dd>
          </div>
        )}
        
        {opportunity.itb_created_by && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Created By</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_created_by}</dd>
          </div>
        )}
        
        {opportunity.itb_bac_chairman && (
          <div>
            <dt className="text-sm font-medium text-gray-500">BAC Chairman</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_bac_chairman}</dd>
          </div>
        )}
        
        {opportunity.itb_bac_secretariat && (
          <div>
            <dt className="text-sm font-medium text-gray-500">BAC Secretariat</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_bac_secretariat}</dd>
          </div>
        )}
        
        {opportunity.itb_bid_supplements !== undefined && opportunity.itb_bid_supplements > 0 && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Bid Supplements</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_bid_supplements}</dd>
          </div>
        )}
        
        {opportunity.itb_document_request_list !== undefined && opportunity.itb_document_request_list > 0 && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Document Request List</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.itb_document_request_list}</dd>
          </div>
        )}
      </div>
      
      {opportunity.itb_description && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <dt className="text-sm font-medium text-gray-500 mb-2">ITB Description</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded">{opportunity.itb_description}</dd>
        </div>
      )}
      
      {opportunity.itb_eligibility && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500 mb-2">Eligibility Requirements</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded">{opportunity.itb_eligibility}</dd>
        </div>
      )}
      
      {(opportunity.source_url || opportunity.detail_url) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <dt className="text-sm font-medium text-gray-500 mb-2">Links</dt>
          {opportunity.detail_url && (
            <dd className="mt-1 text-sm">
              <a href={opportunity.detail_url} target="_blank" rel="noopener noreferrer" 
                className="text-primary-900 hover:underline">
                View Full Details on PhilGEPS →
              </a>
            </dd>
          )}
          {opportunity.source_url && opportunity.source_url !== opportunity.detail_url && (
            <dd className="mt-1 text-sm">
              <a href={opportunity.source_url} target="_blank" rel="noopener noreferrer" 
                className="text-primary-900 hover:underline">
                View Search Results →
              </a>
            </dd>
          )}
        </div>
      )}
    </div>
  );
}

function RfqDetails({ opportunity }: { opportunity: FormattedOpportunity }) {
  // Parse line items if it's a JSON string
  let lineItems: any[] = [];
  if (opportunity.rfq_line_items) {
    try {
      lineItems = JSON.parse(opportunity.rfq_line_items);
    } catch (e) {
      // If parsing fails, treat as a simple string
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-lg font-semibold text-primary-900 mb-4">RFQ Details</h4>
      
      {opportunity.itb_has_active_rfq === 'true' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800 font-medium">This opportunity has an active RFQ</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {opportunity.rfq_solicitation_number && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Solicitation Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_solicitation_number}</dd>
          </div>
        )}
        
        {opportunity.rfq_title && (
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500">RFQ Title</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_title}</dd>
          </div>
        )}
        
        {opportunity.rfq_status && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_status}</dd>
          </div>
        )}
        
        {opportunity.rfq_request_type && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Request Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_request_type}</dd>
          </div>
        )}
        
        {opportunity.rfq_notice_type && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Notice Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_notice_type}</dd>
          </div>
        )}
        
        {opportunity.rfq_business_category && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Business Category</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_business_category}</dd>
          </div>
        )}
        
        {opportunity.rfq_approved_budget && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Approved Budget</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_approved_budget}</dd>
          </div>
        )}
        
        {opportunity.rfq_funding_source && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Funding Source</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_funding_source}</dd>
          </div>
        )}
        
        {opportunity.rfq_area_of_delivery && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Area of Delivery</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_area_of_delivery}</dd>
          </div>
        )}
        
        {opportunity.rfq_delivery_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Delivery Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.rfq_delivery_date)}</dd>
          </div>
        )}
        
        {opportunity.rfq_open_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Open Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.rfq_open_date)}</dd>
          </div>
        )}
        
        {opportunity.rfq_close_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Close Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.rfq_close_date)}</dd>
          </div>
        )}
        
        {opportunity.rfq_submission_deadline && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Submission Deadline</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.rfq_submission_deadline)}</dd>
          </div>
        )}
        
        {opportunity.rfq_published_date && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Published Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(opportunity.rfq_published_date)}</dd>
          </div>
        )}
        
        {opportunity.rfq_contact_person && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Contact Person</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_contact_person}</dd>
          </div>
        )}
        
        {opportunity.rfq_contact_number && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Contact Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_contact_number}</dd>
          </div>
        )}
        
        {opportunity.rfq_client_agency && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Client Agency</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_client_agency}</dd>
          </div>
        )}
        
        {opportunity.rfq_pre_bid_conference && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Pre-bid Conference</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_pre_bid_conference}</dd>
          </div>
        )}
        
        {opportunity.rfq_pre_procurement_conference && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Pre-procurement Conference</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_pre_procurement_conference}</dd>
          </div>
        )}
        
        {opportunity.rfq_trade_agreement && (
          <div>
            <dt className="text-sm font-medium text-gray-500">RFQ Trade Agreement</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_trade_agreement}</dd>
          </div>
        )}
        
        {opportunity.rfq_reason && (
          <div className="md:col-span-3">
            <dt className="text-sm font-medium text-gray-500">RFQ Reason</dt>
            <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_reason}</dd>
          </div>
        )}
      </div>
      
      {opportunity.rfq_description && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">RFQ Description</dt>
          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{opportunity.rfq_description}</dd>
        </div>
      )}
      
      {opportunity.rfq_special_instructions && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Special Instructions</dt>
          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{opportunity.rfq_special_instructions}</dd>
        </div>
      )}
      
      {opportunity.rfq_required_documents && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Required Documents</dt>
          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{opportunity.rfq_required_documents}</dd>
        </div>
      )}
      
      {lineItems.length > 0 && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500 mb-2">Line Items</dt>
          <dd className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineItems.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.name || item.item || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{item.description || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.unit || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </dd>
        </div>
      )}
      
      {opportunity.rfq_attachments && (
        <div className="mt-4">
          <dt className="text-sm font-medium text-gray-500">Attachments</dt>
          <dd className="mt-1 text-sm text-gray-900">{opportunity.rfq_attachments}</dd>
        </div>
      )}
    </div>
  );
}