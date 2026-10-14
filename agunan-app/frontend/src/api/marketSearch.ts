import { apiClient } from './client';

export interface MarketReference {
  title: string;
  url: string;
  description: string;
  source: string;
  price_mentions: string[];
  area_m2: number | null;
  total_price: number | null;
  total_price_is_estimate: boolean;
  price_per_are: number | null;
  comparison_data: {
    property_type: string | null;
    address: string | null;
    ownership: string | null;
    land_shape: string | null;
    source_name: string | null;
    contact_phone: string | null;
    width_m: string | null;
    dimensions_m: string | null;
    facing: string | null;
    road_access: string | null;
    zoning: string | null;
    listing_description: string | null;
    nearby: string[];
    page_enriched: boolean;
  };
  summary_note: string | null;
  matched_locality_level: string;
  matched_locality_area: string;
  reference_kind: 'individual_listing' | 'search_page';
}

export interface MarketSearchResult {
  location: {
    lat: number;
    lon: number;
    area: string;
    street: string | null;
    display_name: string;
  };
  market_summary: {
    sample_count: number;
    price_per_are: { median: number; minimum: number; maximum: number } | null;
    price_per_m2: { median: number; minimum: number; maximum: number } | null;
    conclusion: string;
    price_conclusion: string;
    area_implication: string;
  };
  unit_price_observations: Array<{
    price_per_are: number;
    price_per_m2: number;
    source: string;
    url: string;
  }>;
  search_criteria: {
    land_type: string;
    land_shape: string;
    street: string | null;
    street_search_used: boolean;
    query_used: string;
    locality_queries: Array<{ level: string; area: string; result_count: number }>;
    detail_queries: Array<{ portal: string; result_count: number }>;
    detail_pages_enriched: number;
    facebook_queries_used: string[];
    reference_scope: string;
  };
  facebook_public_result_count: number;
  area_context: {
    status: 'available' | 'unavailable';
    radius_m: number;
    counts: Record<string, number>;
    building_count: number | null;
    observed_categories: Array<{ category: string; feature_count: number }>;
    summary: string;
    price_implication: string;
    source: string;
    caveat?: string;
  };
  references: MarketReference[];
  note: string;
}

export const marketSearchApi = {
  search: async (lat: number, lon: number, landType: string, landShape: string): Promise<MarketSearchResult> => {
    const response = await apiClient.get<MarketSearchResult>('/market-search', {
      params: { lat, lon, land_type: landType, land_shape: landShape },
    });
    return response.data;
  },
};
