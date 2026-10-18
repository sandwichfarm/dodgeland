import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const hash=text=>createHash('sha256').update(text).digest('hex');
/** Bind a release to the canonical compiled method and its real entry counter. */
export function turnStopEvidence(inventory){
 const matches=Object.values(inventory??{}).filter(r=>typeof r.path==='string'&&/(?:^|\/)src\/session\.ts$/.test(r.path.replaceAll('\\','/')));
 if(matches.length!==1)throw Error('Missing canonical stop inventory');
 const record=matches[0];
 if(typeof record.code!=='string'||typeof record.source!=='string'||hash(record.source)!==record.sourceHash)throw Error('Invalid canonical stop source');
 const tree=ts.createSourceFile(record.path,record.code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const owner=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='LocalSession');
 const method=owner?.members.find(n=>ts.isMethodDeclaration(n)&&n.name.getText(tree)==='stop');
 if(tree.parseDiagnostics.length||!method?.body)throw Error('Missing canonical stop method');
 const first=method.body.statements[0],expression=ts.isExpressionStatement(first)?first.expression:undefined;
 const counter=expression&&ts.isPostfixUnaryExpression(expression)&&expression.operator===ts.SyntaxKind.PlusPlusToken?expression.operand:undefined;
 if(!counter||!ts.isElementAccessExpression(counter)||!ts.isNumericLiteral(counter.argumentExpression)||!ts.isPropertyAccessExpression(counter.expression)||counter.expression.name.text!=='f'||!ts.isCallExpression(counter.expression.expression))throw Error('Missing canonical stop entry counter');
 const functionId=counter.argumentExpression.text;
 if(!Object.hasOwn(record.zero?.fnMap??{},functionId))throw Error('Invalid canonical stop counter identity');
 return Object.freeze({sourcePath:record.path,sourceHash:record.sourceHash,methodHash:hash(method.getText(tree)),functionId});
}
export const turnStopMethodHash=method=>{if(typeof method!=='function')throw Error('Missing canonical stop function');return hash(Function.prototype.toString.call(method));};
export function validateTurnReleaseEvidence(inventory,evidence){
 const expected=turnStopEvidence(inventory);
 if(!evidence||evidence.kind!=='LocalSession.stop'||evidence.resultPreserved!==true||typeof evidence.hadResult!=='boolean'||Object.entries(expected).some(([key,value])=>evidence[key]!==value))throw Error('Invalid canonical turn release evidence');
 return expected;
}
export function validateTurnReleaseDelta(inventory,interval){
 if(interval.endObservation?.phase!=='released')return;
 const expected=validateTurnReleaseEvidence(inventory,interval.endObservation.releaseEvidence);
 if(interval.payload?.coverage?.[expected.sourcePath]?.f?.[expected.functionId]!==1)throw Error('Turn release must contain exactly one canonical stop entry');
}
