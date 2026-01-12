import { supabase } from '../lib/supabase';
import { PQBenchmarkStandard, PQBenchmarkThreshold } from '../types/database';

/**
 * Fetch all PQ benchmark standards
 */
export async function fetchBenchmarkStandards(): Promise<PQBenchmarkStandard[]> {
  console.log('🔍 [benchmarkingService] Fetching benchmark standards...');
  
  const { data, error } = await supabase
    .from('pq_benchmark_standards')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ [benchmarkingService] Error fetching benchmark standards:', error);
    throw error;
  }

  console.log('✅ [benchmarkingService] Fetched standards:', {
    count: data?.length || 0,
    standards: data?.map(s => s.name) || []
  });

  return data || [];
}

/**
 * Fetch thresholds for a specific standard
 */
export async function fetchStandardThresholds(standardId: string): Promise<PQBenchmarkThreshold[]> {
  const { data, error } = await supabase
    .from('pq_benchmark_thresholds')
    .select('*')
    .eq('standard_id', standardId)
    .order('sort_order');

  if (error) {
    console.error('❌ Error fetching thresholds:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new benchmark standard
 */
export async function createBenchmarkStandard(standard: {
  name: string;
  description?: string;
}): Promise<PQBenchmarkStandard> {
  const { data, error } = await supabase
    .from('pq_benchmark_standards')
    .insert(standard)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating standard:', error);
    throw error;
  }

  return data;
}

/**
 * Update benchmark standard
 */
export async function updateBenchmarkStandard(
  standardId: string,
  updates: Partial<PQBenchmarkStandard>
): Promise<PQBenchmarkStandard> {
  const { data, error } = await supabase
    .from('pq_benchmark_standards')
    .update(updates)
    .eq('id', standardId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating standard:', error);
    throw error;
  }

  return data;
}

/**
 * Delete benchmark standard (cascade deletes thresholds)
 */
export async function deleteBenchmarkStandard(standardId: string): Promise<void> {
  const { error } = await supabase
    .from('pq_benchmark_standards')
    .delete()
    .eq('id', standardId);

  if (error) {
    console.error('❌ Error deleting standard:', error);
    throw error;
  }
}

/**
 * Add threshold to standard
 */
export async function addThreshold(threshold: {
  standard_id: string;
  min_voltage: number;
  duration: number;
  sort_order?: number;
}): Promise<PQBenchmarkThreshold> {
  // If no sort_order provided, get the next available
  if (threshold.sort_order === undefined) {
    const { data: existingThresholds } = await supabase
      .from('pq_benchmark_thresholds')
      .select('sort_order')
      .eq('standard_id', threshold.standard_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    threshold.sort_order = existingThresholds && existingThresholds.length > 0
      ? existingThresholds[0].sort_order + 1
      : 1;
  }

  const { data, error } = await supabase
    .from('pq_benchmark_thresholds')
    .insert(threshold)
    .select()
    .single();

  if (error) {
    console.error('❌ Error adding threshold:', error);
    throw error;
  }

  return data;
}

/**
 * Update threshold
 */
export async function updateThreshold(
  thresholdId: string,
  updates: Partial<PQBenchmarkThreshold>
): Promise<PQBenchmarkThreshold> {
  const { data, error } = await supabase
    .from('pq_benchmark_thresholds')
    .update(updates)
    .eq('id', thresholdId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating threshold:', error);
    throw error;
  }

  return data;
}

/**
 * Delete threshold
 */
export async function deleteThreshold(thresholdId: string): Promise<void> {
  const { error } = await supabase
    .from('pq_benchmark_thresholds')
    .delete()
    .eq('id', thresholdId);

  if (error) {
    console.error('❌ Error deleting threshold:', error);
    throw error;
  }
}

/**
 * Reorder thresholds
 */
export async function reorderThresholds(
  standardId: string,
  thresholdIds: string[]
): Promise<void> {
  const updatePromises = thresholdIds.map((id, index) =>
    supabase
      .from('pq_benchmark_thresholds')
      .update({ sort_order: index + 1 })
      .eq('id', id)
      .eq('standard_id', standardId)
  );

  const results = await Promise.all(updatePromises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error('❌ Error reordering thresholds:', errors);
    throw new Error('Failed to reorder some thresholds');
  }
}

/**
 * Import thresholds from CSV
 */
export async function importThresholdsCSV(
  standardId: string,
  csvData: Array<{ min_voltage: number; duration: number }>
): Promise<{ success: number; failed: number; errors: Array<{ row: number; message: string }> }> {
  const errors: Array<{ row: number; message: string }> = [];
  let success = 0;
  let failed = 0;

  // Validate standard exists
  const { data: standard, error: standardError } = await supabase
    .from('pq_benchmark_standards')
    .select('id')
    .eq('id', standardId)
    .single();

  if (standardError || !standard) {
    throw new Error('Standard not found');
  }

  // Get existing thresholds to determine sort order
  const { data: existingThresholds } = await supabase
    .from('pq_benchmark_thresholds')
    .select('sort_order')
    .eq('standard_id', standardId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let nextSortOrder = existingThresholds && existingThresholds.length > 0
    ? existingThresholds[0].sort_order + 1
    : 1;

  // Process each row
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 1;

    try {
      // Validation
      if (row.min_voltage < 0 || row.min_voltage > 100) {
        errors.push({
          row: rowNumber,
          message: 'Min. Voltage must be between 0 and 100%'
        });
        failed++;
        continue;
      }

      if (row.duration < 0 || row.duration > 1) {
        errors.push({
          row: rowNumber,
          message: 'Duration must be between 0 and 1 second'
        });
        failed++;
        continue;
      }

      // Check for duplicates
      const { data: existing } = await supabase
        .from('pq_benchmark_thresholds')
        .select('id')
        .eq('standard_id', standardId)
        .eq('min_voltage', row.min_voltage)
        .eq('duration', row.duration)
        .maybeSingle();

      if (existing) {
        errors.push({
          row: rowNumber,
          message: `Duplicate threshold: ${row.min_voltage}% / ${row.duration}s already exists`
        });
        failed++;
        continue;
      }

      // Insert threshold
      const { error: insertError } = await supabase
        .from('pq_benchmark_thresholds')
        .insert({
          standard_id: standardId,
          min_voltage: row.min_voltage,
          duration: row.duration,
          sort_order: nextSortOrder++
        });

      if (insertError) {
        errors.push({
          row: rowNumber,
          message: insertError.message
        });
        failed++;
      } else {
        success++;
      }
    } catch (err: any) {
      errors.push({
        row: rowNumber,
        message: err.message || 'Unknown error'
      });
      failed++;
    }
  }

  return { success, failed, errors };
}

/**
 * Validate threshold uniqueness
 */
export async function validateThresholdUnique(
  standardId: string,
  minVoltage: number,
  duration: number,
  excludeThresholdId?: string
): Promise<boolean> {
  let query = supabase
    .from('pq_benchmark_thresholds')
    .select('id')
    .eq('standard_id', standardId)
    .eq('min_voltage', minVoltage)
    .eq('duration', duration);

  if (excludeThresholdId) {
    query = query.neq('id', excludeThresholdId);
  }

  const { data } = await query.maybeSingle();
  return !data;
}
