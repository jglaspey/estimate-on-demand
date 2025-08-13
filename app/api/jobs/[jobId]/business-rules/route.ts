import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserDecision } from '../../../../../src/generated/prisma';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const ruleAnalyses = await prisma.ruleAnalysis.findMany({
      where: { jobId },
      orderBy: [
        { ruleType: 'asc' },
        { analyzedAt: 'desc' }
      ]
    });

    // Group by rule type, taking the latest analysis for each
    const latestAnalyses = ruleAnalyses.reduce((acc, analysis) => {
      if (!acc[analysis.ruleType] || 
          (analysis.analyzedAt && acc[analysis.ruleType].analyzedAt && 
           analysis.analyzedAt > acc[analysis.ruleType].analyzedAt!)) {
        acc[analysis.ruleType] = analysis;
      }
      return acc;
    }, {} as Record<string, typeof ruleAnalyses[0]>);

    return NextResponse.json({ 
      businessRules: Object.values(latestAnalyses) 
    });
  } catch (error) {
    console.error('Error fetching business rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business rules' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const body = await request.json();
    const { ruleId, userDecision, userNotes, editedValues } = body;

    const updatedRule = await prisma.ruleAnalysis.update({
      where: { id: ruleId },
      data: {
        userDecision: userDecision as UserDecision,
        userNotes,
        editedValues,
        decidedAt: new Date()
      }
    });

    return NextResponse.json({ rule: updatedRule });
  } catch (error) {
    console.error('Error updating business rule decision:', error);
    return NextResponse.json(
      { error: 'Failed to update business rule decision' },
      { status: 500 }
    );
  }
}