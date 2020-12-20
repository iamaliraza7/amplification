import { print } from "recast";
import { builders, namedTypes } from "ast-types";
import { camelCase } from "camel-case";
import { Entity, Module } from "../../../types";
import { readFile, relativeImportPath } from "../../../util/module";
import {
  interpolate,
  importNames,
  addImports,
  removeTSVariableDeclares,
  removeTSInterfaceDeclares,
  removeTSClassDeclares,
  // getClassDeclarationById,
  // isConstructor,
  removeESLintComments,
  importContainedIdentifiers,
  removeImportsTSIgnoreComments,
} from "../../../util/ast";
// import { isOneToOneRelationField, isRelationField } from "../../../util/field";
import { SRC_DIRECTORY } from "../../constants";
import { DTOs, getDTONameToPath } from "../create-dtos";
import { getImportableDTOs } from "../dto/create-dto-module";
import { createServiceId } from "../service/create-service";
import { createSelect } from "../controller/create-select";

// const TO_MANY_MIXIN_ID = builders.identifier("Mixin");

const templatePath = require.resolve("./resolver.template.ts");
// const toManyTemplatePath = require.resolve("./to-many.template.ts");

export async function createResolverModule(
  entityName: string,
  entityType: string,
  entityServiceModule: string,
  entity: Entity,
  dtos: DTOs,
  entityIdToName: Record<string, string>,
  entitiesByName: Record<string, Entity>
): Promise<Module> {
  const modulePath = `${SRC_DIRECTORY}/${entityName}/${entityName}.resolver.ts`;
  const file = await readFile(templatePath);

  const serviceId = createServiceId(entityType);
  const id = createResolverId(entityType);
  const entityDTOs = dtos[entity.name];
  const entityDTO = entityDTOs.entity;

  interpolate(file, {
    RESOLVER: id,
    SERVICE: serviceId,
    ENTITY: entityDTO.id,
    ENTITY_NAME: builders.stringLiteral(entityType),
    ENTITY_PLURAL_NAME: builders.stringLiteral(camelCase(entityType)),
    ENTITY_SINGULAR_NAME: builders.stringLiteral(
      camelCase(entity.pluralDisplayName)
    ),
    SELECT: createSelect(entityDTO, entity),
    CREATE_ARGS: dtos[entity.name].createArgs.id,
    UPDATE_ARGS: dtos[entity.name].updateArgs.id,
    DELETE_ARGS: dtos[entity.name].deleteArgs.id,
    FIND_MANY_ARGS: dtos[entity.name].findManyArgs.id,
    FIND_ONE_ARGS: dtos[entity.name].findOneArgs.id,
  });

  // const classDeclaration = getClassDeclarationById(file, id);

  // const toManyRelationships: EntityLookupField[] = entity.fields.filter(
  //   (field): field is EntityLookupField =>
  //     isRelationField(field) && !isOneToOneRelationField(field)
  // );

  // for (const field of toManyRelationships) {
  //   const toManyFile = await readFile(toManyTemplatePath);
  //   const relatedEntityId = field.properties.relatedEntityId;
  //   const relatedEntityName = entityIdToName[relatedEntityId];
  //   const relatedEntity = entitiesByName[relatedEntityName];
  //   const relatedEntityDTO = dtos[relatedEntityName].entity;
  //   const relatedEntityWhereUniqueInput =
  //     dtos[relatedEntityName].whereUniqueInput;
  //   const relatedEntityWhereInput = dtos[relatedEntityName].whereInput;
  //   interpolate(toManyFile, {
  //     RELATED_ENTITY_WHERE_UNIQUE_INPUT: relatedEntityWhereUniqueInput.id,
  //     RELATED_ENTITY_WHERE_INPUT: relatedEntityWhereInput.id,
  //     RELATED_ENTITY: builders.identifier(relatedEntityName),
  //     RELATED_ENTITY_NAME: builders.stringLiteral(relatedEntityName),
  //     WHERE_UNIQUE_INPUT: entityDTOs.whereUniqueInput.id,
  //     SERVICE: serviceId,
  //     ENTITY_NAME: builders.stringLiteral(entityType),
  //     PROPERTY: builders.identifier(field.name),
  //     FIND_MANY: builders.identifier(camelCase(`findMany ${field.name}`)),
  //     FIND_MANY_PATH: builders.stringLiteral(`/:id/${field.name}`),
  //     CREATE: builders.identifier(camelCase(`create ${field.name}`)),
  //     CREATE_PATH: builders.stringLiteral(`/:id/${field.name}`),
  //     DELETE: builders.identifier(camelCase(`delete ${field.name}`)),
  //     DELETE_PATH: builders.stringLiteral(`/:id/${field.name}`),
  //     UPDATE: builders.identifier(camelCase(`update ${field.name}`)),
  //     UPDATE_PATH: builders.stringLiteral(`/:id/${field.name}`),
  //     SELECT: createSelect(relatedEntityDTO, relatedEntity),
  //   });
  //   const mixinClassDeclaration = findClassDeclarationById(
  //     toManyFile,
  //     TO_MANY_MIXIN_ID
  //   );
  //   if (!mixinClassDeclaration) {
  //     throw new Error(`Could not find ${TO_MANY_MIXIN_ID.name}`);
  //   }
  //   classDeclaration.body.body.push(
  //     ...mixinClassDeclaration.body.body.filter(
  //       (member) =>
  //         namedTypes.ClassMethod.check(member) && !isConstructor(member)
  //     )
  //   );
  // }

  const serviceImport = importNames(
    [serviceId],
    relativeImportPath(modulePath, entityServiceModule)
  );

  const dtoNameToPath = getDTONameToPath(dtos);
  const dtoImports = importContainedIdentifiers(
    file,
    getImportableDTOs(modulePath, dtoNameToPath)
  );

  addImports(file, [serviceImport, ...dtoImports]);
  removeImportsTSIgnoreComments(file);
  removeESLintComments(file);
  removeTSVariableDeclares(file);
  removeTSInterfaceDeclares(file);
  removeTSClassDeclares(file);

  return {
    path: modulePath,
    code: print(file).code,
  };
}

export function createResolverId(entityType: string): namedTypes.Identifier {
  return builders.identifier(`${entityType}Resolver`);
}
